import { NextRequest } from 'next/server'
import { requireProjectOwner } from '@/lib/auth/guards'
import { createClient } from '@/lib/supabase/server'
import { errorResponse, handleApiError } from '@/lib/utils/api-response'
import { streamClaude, createSSEResponse } from '@/lib/ai/claude'

interface RouteContext {
  params: Promise<{ id: string }>
}

const PPT_SYSTEM_PROMPT = `당신은 스타트업 서비스 소개 프레젠테이션 전문 디자이너입니다.
주어진 사업 아이디어와 평가 결과를 바탕으로 서비스 소개 PPT를 HTML 슬라이드로 생성합니다.

규칙:
1. 반드시 완전한 HTML 문서를 생성합니다 (<!DOCTYPE html>부터 </html>까지)
2. Tailwind CSS CDN을 사용합니다 (<script src="https://cdn.tailwindcss.com"></script>)
3. 각 슬라이드는 <section class="slide"> 태그로 구분합니다
4. 슬라이드 비율은 16:9 (width: 960px, height: 540px)
5. 한국어로 작성합니다
6. 슬라이드 간 네비게이션(이전/다음 버튼, 키보드 화살표)을 JavaScript로 구현합니다
7. 현재 슬라이드 번호 / 전체 슬라이드 수를 표시합니다
8. 이모지를 아이콘 대용으로 활용합니다 (SVG 사용 금지 — 토큰 절약)
9. CSS는 Tailwind 유틸리티 클래스만 사용하고, <style> 블록은 슬라이드 레이아웃/네비게이션 용도로만 최소한으로 작성합니다
10. 각 슬라이드의 텍스트는 핵심 키워드와 짧은 문장으로 간결하게 작성합니다 (장문 금지)
11. 다음 7개 슬라이드를 포함합니다:
   - 표지 (프로젝트명, 한 줄 소개)
   - 문제 정의 & 솔루션
   - 타겟 시장 & 핵심 기능
   - 비즈니스 모델 & 경쟁 우위
   - 평가 점수 요약
   - 로드맵
   - CTA (연락처, 다음 단계)

HTML만 출력하고, 다른 설명은 포함하지 마세요.`

export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params
    await requireProjectOwner(id)

    const supabase = await createClient()

    const { data: project, error: projectError } = await supabase
      .from('bi_projects')
      .select('*')
      .eq('id', id)
      .single()

    if (projectError || !project) {
      return errorResponse('프로젝트를 찾을 수 없습니다.', 404)
    }

    if (!project.gate_2_passed_at) {
      return errorResponse('평가 단계(Gate 2)를 먼저 완료해주세요.', 400)
    }

    const { data: ideaCard } = await supabase
      .from('bi_idea_cards')
      .select('*')
      .eq('project_id', id)
      .eq('is_confirmed', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    const { data: evaluation } = await supabase
      .from('bi_evaluations')
      .select('*')
      .eq('project_id', id)
      .eq('is_confirmed', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (!ideaCard || !evaluation) {
      return errorResponse('확정된 아이디어와 평가가 필요합니다.', 400)
    }

    const { data: existingDoc } = await supabase
      .from('bi_documents')
      .select('id, is_confirmed')
      .eq('project_id', id)
      .eq('type', 'ppt')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (existingDoc?.is_confirmed) {
      return errorResponse('이미 확정된 PPT가 있습니다.', 400)
    }

    const userPrompt = `다음 정보를 바탕으로 서비스 소개 PPT 슬라이드를 HTML로 생성해주세요:

## 프로젝트명
${project.name}

## 해결하려는 문제
${ideaCard.problem || ideaCard.raw_input}

## 솔루션
${ideaCard.solution || ''}

## 타겟 고객
${ideaCard.target || ''}

## 차별화 포인트
${ideaCard.differentiation || ''}

## 평가 점수
- 종합 점수: ${evaluation.total_score}점
- 투자 관점: ${evaluation.investor_score}점
- 시장 관점: ${evaluation.market_score}점
- 기술 관점: ${evaluation.tech_score}점

완전한 HTML 문서를 생성해주세요.`

    const projectId = id
    const existingDocId = existingDoc?.id
    const projectName = project.name
    const model = 'claude-sonnet-4-20250514'

    async function* generateDocument() {
      let fullContent = ''

      yield { type: 'start', data: JSON.stringify({ type: 'ppt', model }) }

      const stream = streamClaude(PPT_SYSTEM_PROMPT, userPrompt, {
        model,
        temperature: 0.7,
        maxTokens: 16000,
      })

      for await (const event of stream) {
        if (event.type === 'text') {
          fullContent += event.data
          yield { type: 'text', data: event.data }
        }
      }

      fullContent = fullContent.trim()
      const fenceMatch = fullContent.match(/^```(?:html)?\s*\n?([\s\S]*?)\n?\s*```$/)
      if (fenceMatch) {
        fullContent = fenceMatch[1].trim()
      }

      const supabaseUpdate = await createClient()

      let documentId: string

      if (existingDocId) {
        const { data: updated, error: updateError } = await supabaseUpdate
          .from('bi_documents')
          .update({
            content: fullContent,
            ai_model_used: model,
          })
          .eq('id', existingDocId)
          .select('id')
          .single()

        if (updateError) throw updateError
        documentId = updated.id
      } else {
        const { data: created, error: createError } = await supabaseUpdate
          .from('bi_documents')
          .insert({
            project_id: projectId,
            type: 'ppt',
            title: `${projectName} 서비스 소개 PPT`,
            content: fullContent,
            ai_model_used: model,
          })
          .select('id')
          .single()

        if (createError) throw createError
        documentId = created.id
      }

      yield {
        type: 'complete',
        data: JSON.stringify({
          documentId,
          type: 'ppt',
        })
      }
    }

    return createSSEResponse(generateDocument())
  } catch (error) {
    return handleApiError(error)
  }
}
