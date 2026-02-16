import { NextRequest } from 'next/server'
import { requireProjectOwner } from '@/lib/auth/guards'
import { createClient } from '@/lib/supabase/server'
import { errorResponse, handleApiError } from '@/lib/utils/api-response'
import { preparePrompt } from '@/lib/prompts'
import { streamClaude, createSSEResponse } from '@/lib/ai/claude'

interface RouteContext {
  params: Promise<{ id: string }>
}

// POST: 요약 피치 생성 (SSE 스트리밍)
export async function POST(
  request: NextRequest,
  routeContext: RouteContext
) {
  try {
    const { id } = await routeContext.params
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

    // 기존 피치 확인
    const { data: existingDoc } = await supabase
      .from('bi_documents')
      .select('id, is_confirmed')
      .eq('project_id', id)
      .eq('type', 'pitch')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (existingDoc?.is_confirmed) {
      return errorResponse('이미 확정된 피치가 있습니다.', 400)
    }

    // 컨텍스트 구성
    const promptContext = JSON.stringify({
      project_name: project.name,
      idea: {
        problem: ideaCard.problem,
        solution: ideaCard.solution,
        target: ideaCard.target,
        differentiation: ideaCard.differentiation,
      },
      evaluation: {
        total_score: evaluation.total_score,
        recommendations: evaluation.recommendations,
      },
    }, null, 2)

    // 프롬프트 템플릿 변수 (개별 필드 + 전체 JSON 모두 지원)
    const promptVariables: Record<string, string> = {
      context: promptContext,
      project_name: project.name || '',
      idea_summary: ideaCard.raw_input || '',
      raw_input: ideaCard.raw_input || '',
      problem: ideaCard.problem || '',
      solution: ideaCard.solution || '',
      target: ideaCard.target || '',
      differentiation: ideaCard.differentiation || '',
      total_score: String(evaluation.total_score ?? ''),
      recommendations: Array.isArray(evaluation.recommendations)
        ? evaluation.recommendations.join(', ')
        : String(evaluation.recommendations ?? ''),
    }

    // 프롬프트 준비
    const prompt = await preparePrompt('pitch_summary', promptVariables)

    if (!prompt) {
      return errorResponse('피치 프롬프트를 찾을 수 없습니다.', 500)
    }

    const projectId = id
    const existingDocId = existingDoc?.id
    const projectName = project.name
    const systemPrompt = prompt.systemPrompt
    const userPrompt = prompt.userPrompt
    const model = prompt.model
    const temperature = prompt.temperature
    const maxTokens = prompt.maxTokens

    // SSE 스트리밍 생성기
    async function* generateDocument() {
      let fullContent = ''

      yield { type: 'start', data: JSON.stringify({ type: 'pitch', model }) }

      const stream = streamClaude(systemPrompt, userPrompt, {
        model,
        temperature,
        maxTokens,
      })

      for await (const event of stream) {
        if (event.type === 'text') {
          fullContent += event.data
          yield { type: 'text', data: event.data }
        }
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
            type: 'pitch',
            title: `${projectName} 피치`,
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
          type: 'pitch',
        })
      }
    }

    return createSSEResponse(generateDocument())
  } catch (error) {
    return handleApiError(error)
  }
}
