import { NextRequest } from 'next/server'
import { z } from 'zod'
import { requireInstitutionAccess } from '@/lib/auth/institution'
import { createServiceClient } from '@/lib/supabase/service'
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api-response'

const inviteSchema = z.object({
  email: z.string().email().optional(),
  mentor_id: z.string().uuid().optional(),
}).refine((data) => data.email || data.mentor_id, {
  message: 'email 또는 mentor_id가 필요합니다.',
})

// POST: 멘토 초대 (이메일 또는 ID로 기관 풀에 추가)
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const { institutionId } = await requireInstitutionAccess(searchParams.get('institution_id'))

    const body = await request.json()
    const validated = inviteSchema.parse(body)

    const supabase = createServiceClient()

    let mentorId = validated.mentor_id

    // 이메일로 초대하는 경우: 멘토 사용자 조회
    if (!mentorId && validated.email) {
      const { data: mentor, error: mentorError } = await supabase
        .from('bi_users')
        .select('id, role')
        .eq('email', validated.email)
        .single()

      if (mentorError || !mentor) {
        return errorResponse('해당 이메일의 사용자를 찾을 수 없습니다.', 404)
      }

      if (mentor.role !== 'mentor') {
        return errorResponse('해당 사용자는 멘토 역할이 아닙니다.', 400)
      }

      mentorId = mentor.id
    }

    const { data, error } = await supabase
      .from('bi_mentor_institution_pool')
      .insert({
        mentor_id: mentorId!,
        institution_id: institutionId,
        status: 'active',
      })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return errorResponse('이미 소속된 멘토입니다.', 409)
      }
      console.error('Mentor invite error:', error.message)
      return errorResponse('멘토 초대에 실패했습니다.', 500)
    }

    return successResponse(data, 201)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(error.issues[0].message, 400, 'VALIDATION_ERROR')
    }
    return handleApiError(error)
  }
}
