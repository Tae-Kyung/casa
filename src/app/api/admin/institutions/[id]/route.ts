import { NextRequest } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/auth/guards'
import { createClient } from '@/lib/supabase/server'
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api-response'

const updateInstitutionSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  region: z.string().min(1).optional(),
  type: z.enum(['center', 'university', 'other']).optional(),
  address: z.string().nullable().optional(),
  contact_email: z.string().email().nullable().optional(),
  contact_phone: z.string().nullable().optional(),
  max_mentors: z.number().int().min(1).optional(),
  max_projects: z.number().int().min(1).optional(),
})

interface RouteContext {
  params: Promise<{ id: string }>
}

// GET: 기관 상세 + 통계
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    await requireAdmin()
    const { id } = await context.params

    const supabase = await createClient()

    const { data: institution, error } = await supabase
      .from('bi_institutions')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !institution) {
      return errorResponse('기관을 찾을 수 없습니다.', 404)
    }

    // 통계: 소속 멘토 수
    const { count: mentorCount } = await supabase
      .from('bi_mentor_institution_pool')
      .select('*', { count: 'exact', head: true })
      .eq('institution_id', id)

    // 통계: 매핑된 프로젝트 수
    const { count: projectCount } = await supabase
      .from('bi_project_institution_maps')
      .select('*', { count: 'exact', head: true })
      .eq('institution_id', id)

    // 통계: 소속 담당자 수
    const { count: memberCount } = await supabase
      .from('bi_institution_members')
      .select('*', { count: 'exact', head: true })
      .eq('institution_id', id)

    return successResponse({
      ...institution,
      stats: {
        mentors: mentorCount || 0,
        projects: projectCount || 0,
        members: memberCount || 0,
      },
    })
  } catch (error) {
    return handleApiError(error)
  }
}

// PATCH: 기관 수정
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    await requireAdmin()
    const { id } = await context.params

    const body = await request.json()
    const validatedData = updateInstitutionSchema.parse(body)

    const supabase = await createClient()

    const { data, error } = await supabase
      .from('bi_institutions')
      .update({ ...validatedData, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Institution update error:', error.message)
      return errorResponse('기관 수정에 실패했습니다.', 500)
    }

    return successResponse(data)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(error.issues[0].message, 400, 'VALIDATION_ERROR')
    }
    return handleApiError(error)
  }
}
