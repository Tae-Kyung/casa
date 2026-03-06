import { NextRequest } from 'next/server'
import { z } from 'zod'
import { requireInstitutionAccess } from '@/lib/auth/institution'
import { createClient } from '@/lib/supabase/server'
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api-response'

const inviteSchema = z.object({
  mentor_id: z.string().uuid(),
})

// POST: 멘토 초대 (기존 멘토를 기관 풀에 추가)
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const { institutionId } = await requireInstitutionAccess(searchParams.get('institution_id'))

    const body = await request.json()
    const { mentor_id } = inviteSchema.parse(body)

    const supabase = await createClient()

    const { data, error } = await supabase
      .from('bi_mentor_institution_pool')
      .insert({
        mentor_id,
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
