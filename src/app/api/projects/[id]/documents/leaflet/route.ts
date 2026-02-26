import { NextRequest } from 'next/server'
import { requireProjectOwner } from '@/lib/auth/guards'
import { deductCredit } from '@/lib/credits'
import { createClient } from '@/lib/supabase/server'
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api-response'
import { preparePrompt } from '@/lib/prompts'
import { generateImage } from '@/lib/ai/gemini'

// 이미지 생성은 오래 걸릴 수 있으므로 타임아웃 확장
export const maxDuration = 120

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params
    const user = await requireProjectOwner(id)
    await deductCredit(user.id, 'ai_doc_leaflet', id)

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
      raw_input: ideaCard.raw_input || '',
      total_score: String(evaluation.total_score ?? ''),
      investor_score: String(evaluation.investor_score ?? ''),
      market_score: String(evaluation.market_score ?? ''),
      tech_score: String(evaluation.tech_score ?? ''),
    }

    const prompt = await preparePrompt('doc_leaflet', promptVariables)

    if (!prompt) {
      return errorResponse('리플렛 프롬프트를 찾을 수 없습니다.', 500)
    }

    // Gemini 이미지 생성 호출
    const result = await generateImage(prompt.systemPrompt, prompt.userPrompt, {
      model: prompt.model,
      temperature: prompt.temperature,
    })

    // Supabase Storage에 이미지 업로드
    const ext = result.mimeType === 'image/jpeg' ? 'jpg' : 'png'
    const fileName = `leaflet-${id}-${Date.now()}.${ext}`
    const filePath = `leaflets/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(filePath, result.imageData, {
        contentType: result.mimeType,
        cacheControl: '3600',
        upsert: true,
      })

    if (uploadError) {
      if (uploadError.message.includes('Bucket not found')) {
        return errorResponse(
          '스토리지 버킷(documents)이 설정되지 않았습니다. 관리자에게 문의하세요.',
          500
        )
      }
      throw uploadError
    }

    // 공개 URL 생성
    const { data: publicUrl } = supabase.storage
      .from('documents')
      .getPublicUrl(filePath)

    const imageUrl = publicUrl.publicUrl

    // DB 저장
    let documentId: string

    if (existingDoc?.id) {
      const { data: updated, error: updateError } = await supabase
        .from('bi_documents')
        .update({
          content: imageUrl,
          storage_path: imageUrl,
          file_name: fileName,
          ai_model_used: prompt.model,
        })
        .eq('id', existingDoc.id)
        .select('id')
        .single()

      if (updateError) throw updateError
      documentId = updated.id
    } else {
      const { data: created, error: createError } = await supabase
        .from('bi_documents')
        .insert({
          project_id: id,
          type: 'leaflet',
          title: `${project.name} 홍보 리플렛`,
          content: imageUrl,
          storage_path: imageUrl,
          file_name: fileName,
          ai_model_used: prompt.model,
        })
        .select('id')
        .single()

      if (createError) throw createError
      documentId = created.id
    }

    return successResponse({
      documentId,
      type: 'leaflet',
      imageUrl,
      model: prompt.model,
    })
  } catch (error) {
    return handleApiError(error)
  }
}
