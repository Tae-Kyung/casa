import { NextRequest } from 'next/server'
import { requireInstitutionAccess } from '@/lib/auth/institution'
import { createServiceClient } from '@/lib/supabase/service'
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api-response'
import { logAudit, extractRequestInfo } from '@/lib/security/audit'
import { createNotification } from '@/lib/notifications'

// POST: 수당 승인
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { searchParams } = new URL(request.url)
    const { user } = await requireInstitutionAccess(searchParams.get('institution_id'))
    const { id } = await context.params

    const supabase = createServiceClient()

    // 낙관적 잠금: pending 상태에서만 승인 가능
    const { data, error } = await supabase
      .from('bi_mentor_payouts')
      .update({
        status: 'approved',
        approved_by: user.id,
        approved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('status', 'pending')
      .select('*')
      .single()

    if (error || !data) {
      return errorResponse('수당 승인에 실패했습니다. (이미 처리되었거나 존재하지 않습니다)', 400)
    }

    const { ipAddress, userAgent } = extractRequestInfo(request)
    await logAudit({
      userId: user.id,
      action: 'payout_approve',
      resourceType: 'payout',
      resourceId: id,
      ipAddress,
      userAgent,
    })

    // 프로젝트명 조회 (payout → report → match → project)
    let projectName = '프로젝트'
    if (data.report_id) {
      const { data: report } = await supabase
        .from('bi_mentoring_reports')
        .select('match_id')
        .eq('id', data.report_id)
        .single()
      if (report?.match_id) {
        const { data: match } = await supabase
          .from('bi_mentor_matches')
          .select('project_id')
          .eq('id', report.match_id)
          .single()
        if (match?.project_id) {
          const { data: project } = await supabase
            .from('bi_projects')
            .select('name')
            .eq('id', match.project_id)
            .single()
          if (project?.name) projectName = project.name
        }
      }
    }

    // 멘토에게 알림
    if (data.mentor_id) {
      await createNotification({
        userId: data.mentor_id,
        type: 'payout_approved',
        title: `[${projectName}] 멘토링 수당이 승인되었습니다.`,
        message: `세션 ${data.total_sessions || 0}회, ${(data.amount || 0).toLocaleString()}원`,
        link: '/mentoring/payouts',
      })
    }

    return successResponse(data)
  } catch (error) {
    return handleApiError(error)
  }
}
