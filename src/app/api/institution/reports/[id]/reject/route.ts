import { NextRequest } from 'next/server'
import { z } from 'zod'
import { requireInstitutionAccess } from '@/lib/auth/institution'
import { createServiceClient } from '@/lib/supabase/service'
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api-response'
import { createNotification } from '@/lib/notifications'

const rejectSchema = z.object({
  reason: z.string().min(1).max(1000),
})

// POST: 보고서 반려
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { searchParams } = new URL(request.url)
    await requireInstitutionAccess(searchParams.get('institution_id'))
    const { id } = await context.params

    const body = await request.json()
    const { reason } = rejectSchema.parse(body)

    const supabase = createServiceClient()

    // 보고서 조회 (멘토 알림용)
    const { data: report } = await supabase
      .from('bi_mentoring_reports')
      .select('*')
      .eq('id', id)
      .single()

    const { error } = await supabase
      .from('bi_mentoring_reports')
      .update({
        status: 'rejected',
        rejection_reason: reason,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (error) {
      console.error('Report reject error:', error.message)
      return errorResponse('보고서 반려에 실패했습니다.', 500)
    }

    // Fetch mentor_id from the match (FK join not supported by generated types)
    let mentorId: string | undefined
    if (report?.match_id) {
      const { data: match } = await supabase
        .from('bi_mentor_matches')
        .select('mentor_id')
        .eq('id', report.match_id)
        .single()
      mentorId = match?.mentor_id
    }
    if (mentorId) {
      await createNotification({
        userId: mentorId,
        type: 'report_rejected',
        title: '보고서가 반려되었습니다.',
        message: reason,
        link: '/dashboard',
      })
    }

    return successResponse({ message: '보고서가 반려되었습니다.' })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(error.issues[0].message, 400, 'VALIDATION_ERROR')
    }
    return handleApiError(error)
  }
}
