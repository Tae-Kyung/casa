import { NextRequest } from 'next/server'
import { requireProjectOwner } from '@/lib/auth/guards'
import { createClient } from '@/lib/supabase/server'
import { errorResponse, handleApiError } from '@/lib/utils/api-response'
import { streamClaude, createSSEResponse } from '@/lib/ai/claude'

interface RouteContext {
  params: Promise<{ id: string }>
}

const INFOGRAPHIC_SYSTEM_PROMPT = `당신은 스타트업 인포그래픽 전문 디자이너입니다.
주어진 사업 아이디어와 평가 결과를 바탕으로 세로형 인포그래픽 HTML을 생성합니다.

규칙:
1. 반드시 완전한 HTML 문서를 생성합니다 (<!DOCTYPE html>부터 </html>까지)
2. Tailwind CSS CDN을 사용합니다
3. 세로형 인포그래픽 (폭 800px, 중앙 정렬)
4. inline SVG를 사용하여 차트, 다이어그램, 아이콘을 직접 그립니다
5. 한국어로 작성합니다
6. 데이터 시각화에 집중 (숫자, 비율, 흐름도)
7. 색상 팔레트를 통일하여 전문적인 느낌을 줍니다
8. 다음 내용을 포함합니다:
   - 제목 영역 (프로젝트명, 한 줄 소개)
   - 문제 현황 수치 (시각적 통계)
   - 솔루션 흐름도 (단계별 프로세스)
   - 핵심 기능 (아이콘 + 짧은 설명)
   - 시장 규모 (차트 또는 숫자 시각화)
   - 평가 점수 시각화 (바 차트 또는 게이지)
   - 로드맵 타임라인

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
      .eq('type', 'infographic')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (existingDoc?.is_confirmed) {
      return errorResponse('이미 확정된 인포그래픽이 있습니다.', 400)
    }

    const userPrompt = `다음 정보를 바탕으로 세로형 인포그래픽 HTML을 생성해주세요:

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

      yield { type: 'start', data: JSON.stringify({ type: 'infographic', model }) }

      const stream = streamClaude(INFOGRAPHIC_SYSTEM_PROMPT, userPrompt, {
        model,
        temperature: 0.7,
        maxTokens: 10000,
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
            type: 'infographic',
            title: `${projectName} 인포그래픽`,
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
          type: 'infographic',
        })
      }
    }

    return createSSEResponse(generateDocument())
  } catch (error) {
    return handleApiError(error)
  }
}
