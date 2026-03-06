import { NextRequest } from 'next/server'
import { z } from 'zod'
import { requireInstitutionAccess } from '@/lib/auth/institution'
import { createClient } from '@/lib/supabase/server'
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api-response'
import type { MentorMatchStatus } from '@/types/database'

const updateMatchSchema = z.object({
  status: z.enum(['assigned', 'in_progress', 'review', 'completed', 'cancelled']),
})

// PATCH: 매칭 상태 변경
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { searchParams } = new URL(request.url)
    await requireInstitutionAccess(searchParams.get('institution_id'))
    const { id } = await context.params

    const body = await request.json()
    const { status } = updateMatchSchema.parse(body)

    const supabase = await createClient()

    const { data, error } = await supabase
      .from('bi_mentor_matches')
      .update({ status: status as MentorMatchStatus })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Match update error:', error.message)
      return errorResponse('매칭 상태 변경에 실패했습니다.', 500)
    }

    return successResponse(data)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(error.issues[0].message, 400, 'VALIDATION_ERROR')
    }
    return handleApiError(error)
  }
}
