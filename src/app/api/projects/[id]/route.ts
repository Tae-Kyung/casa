import { NextRequest } from 'next/server'
import { z } from 'zod'
import { requireAuth, requireProjectOwner } from '@/lib/auth/guards'
import { createClient } from '@/lib/supabase/server'
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api-response'

// 프로젝트 업데이트 스키마
const updateProjectSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  status: z.enum(['draft', 'in_progress', 'completed', 'archived']).optional(),
})

interface RouteContext {
  params: Promise<{ id: string }>
}

// GET: 프로젝트 상세 조회
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    await requireAuth()

    const { id } = await context.params
    const supabase = await createClient()

    // 프로젝트와 관련 데이터 조회
    const { data: project, error } = await supabase
      .from('bi_projects')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !project) {
      return errorResponse('프로젝트를 찾을 수 없습니다.', 404)
    }

    // 아이디어 카드 조회
    const { data: ideaCard } = await supabase
      .from('bi_idea_cards')
      .select('*')
      .eq('project_id', id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    // 평가 조회
    const { data: evaluation } = await supabase
      .from('bi_evaluations')
      .select('*')
      .eq('project_id', id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    // 문서 조회
    const { data: documents } = await supabase
      .from('bi_documents')
      .select('*')
      .eq('project_id', id)
      .order('created_at', { ascending: false })

    return successResponse({
      ...project,
      ideaCard: ideaCard || null,
      evaluation: evaluation || null,
      documents: documents || [],
    })
  } catch (error) {
    return handleApiError(error)
  }
}

// PATCH: 프로젝트 수정
export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params
    await requireProjectOwner(id)

    const body = await request.json()
    const validatedData = updateProjectSchema.parse(body)

    const supabase = await createClient()

    const { data, error } = await supabase
      .from('bi_projects')
      .update({
        ...validatedData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return errorResponse('프로젝트 업데이트에 실패했습니다.', 500)
    }

    return successResponse(data)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(error.issues[0].message, 400, 'VALIDATION_ERROR')
    }
    return handleApiError(error)
  }
}

// DELETE: 프로젝트 삭제
export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params
    await requireProjectOwner(id)

    const supabase = await createClient()

    const { error } = await supabase
      .from('bi_projects')
      .delete()
      .eq('id', id)

    if (error) {
      return errorResponse('프로젝트 삭제에 실패했습니다.', 500)
    }

    return successResponse({ deleted: true })
  } catch (error) {
    return handleApiError(error)
  }
}
