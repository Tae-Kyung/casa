import { NextRequest } from 'next/server'
import { requireProjectOwner } from '@/lib/auth/guards'
import { createClient } from '@/lib/supabase/server'
import { errorResponse, handleApiError } from '@/lib/utils/api-response'
import { preparePrompt } from '@/lib/prompts'
import { createSSEResponse } from '@/lib/ai/claude'
import { streamGemini } from '@/lib/ai/gemini'

interface RouteContext {
  params: Promise<{ id: string }>
}

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
      .eq('type', 'leaflet')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (existingDoc?.is_confirmed) {
      return errorResponse('이미 확정된 리플렛이 있습니다.', 400)
    }

    const promptVariables: Record<string, string> = {
      project_name: project.name || '',
      problem: ideaCard.problem || ideaCard.raw_input || '',
      solution: ideaCard.solution || '',
      target: ideaCard.target || '',
      differentiation: ideaCard.differentiation || '',
      total_score: String(evaluation.total_score ?? ''),
      investor_score: String(evaluation.investor_score ?? ''),
      market_score: String(evaluation.market_score ?? ''),
      tech_score: String(evaluation.tech_score ?? ''),
    }

    const prompt = await preparePrompt('doc_leaflet', promptVariables)

    if (!prompt) {
      return errorResponse('리플렛 프롬프트를 찾을 수 없습니다.', 500)
    }

    const projectId = id
    const existingDocId = existingDoc?.id
    const projectName = project.name
    const systemPrompt = prompt.systemPrompt
    const userPrompt = prompt.userPrompt
    const model = prompt.model
    const temperature = prompt.temperature
    const maxTokens = prompt.maxTokens

    async function* generateDocument() {
      let fullContent = ''

      yield { type: 'start', data: JSON.stringify({ type: 'leaflet', model }) }

      const stream = streamGemini(systemPrompt, userPrompt, {
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
            type: 'leaflet',
            title: `${projectName} 홍보 리플렛`,
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
          type: 'leaflet',
        })
      }
    }

    return createSSEResponse(generateDocument())
  } catch (error) {
    return handleApiError(error)
  }
}
