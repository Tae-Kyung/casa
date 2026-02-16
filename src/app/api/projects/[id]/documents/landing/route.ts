import { NextRequest } from 'next/server'
import { requireProjectOwner } from '@/lib/auth/guards'
import { createClient } from '@/lib/supabase/server'
import { errorResponse, handleApiError } from '@/lib/utils/api-response'
import { streamClaude, createSSEResponse } from '@/lib/ai/claude'

interface RouteContext {
  params: Promise<{ id: string }>
}

const LANDING_SYSTEM_PROMPT = `당신은 스타트업 랜딩페이지 전문 디자이너입니다.
주어진 사업 아이디어와 평가 결과를 바탕으로 매력적인 랜딩페이지 HTML을 생성합니다.

규칙:
1. 반드시 완전한 HTML 문서를 생성합니다 (<!DOCTYPE html>부터 </html>까지)
2. Tailwind CSS CDN을 사용합니다
3. 반응형 디자인을 적용합니다
4. 한국어로 작성합니다
5. 다음 섹션을 포함합니다:
   - Hero 섹션 (문제 정의 + CTA)
   - 솔루션 소개
   - 주요 기능/특징
   - 타겟 고객
   - 차별화 포인트
   - CTA (이메일 수집 폼)
   - Footer

HTML만 출력하고, 다른 설명은 포함하지 마세요.`

// POST: 랜딩페이지 생성 (SSE 스트리밍)
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params
    await requireProjectOwner(id)

    const supabase = await createClient()

    // Gate 2 통과 확인
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

    // 아이디어와 평가 데이터 조회
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

    // 기존 랜딩페이지 확인
    const { data: existingDoc } = await supabase
      .from('bi_documents')
      .select('id, is_confirmed')
      .eq('project_id', id)
      .eq('type', 'landing')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (existingDoc?.is_confirmed) {
      return errorResponse('이미 확정된 랜딩페이지가 있습니다.', 400)
    }

    // 사용자 프롬프트 구성
    const userPrompt = `다음 정보를 바탕으로 랜딩페이지 HTML을 생성해주세요:

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

    // SSE 스트리밍 생성기
    async function* generateDocument() {
      let fullContent = ''

      yield { type: 'start', data: JSON.stringify({ type: 'landing', model }) }

      const stream = streamClaude(LANDING_SYSTEM_PROMPT, userPrompt, {
        model,
        temperature: 0.7,
        maxTokens: 8000,
      })

      for await (const event of stream) {
        if (event.type === 'text') {
          fullContent += event.data
          yield { type: 'text', data: event.data }
        }
      }

      // 코드 펜스 제거 (AI가 ```html ... ``` 로 감싸는 경우)
      fullContent = fullContent.trim()
      const fenceMatch = fullContent.match(/^```(?:html)?\s*\n?([\s\S]*?)\n?\s*```$/)
      if (fenceMatch) {
        fullContent = fenceMatch[1].trim()
      }

      // DB 저장
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
            type: 'landing',
            title: `${projectName} 랜딩페이지`,
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
          type: 'landing',
        })
      }
    }

    return createSSEResponse(generateDocument())
  } catch (error) {
    return handleApiError(error)
  }
}
