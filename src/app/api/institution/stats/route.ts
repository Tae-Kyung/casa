import { NextRequest } from 'next/server'
import { requireInstitutionAccess } from '@/lib/auth/institution'
import { createClient } from '@/lib/supabase/server'
import { successResponse, handleApiError } from '@/lib/utils/api-response'

// GET: 기관 종합 통계
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const { institutionId } = await requireInstitutionAccess(searchParams.get('institution_id'))

    const supabase = await createClient()

    const [projectsRes, mentorsRes, sessionsRes, pendingPayoutsRes] = await Promise.all([
      supabase
        .from('bi_project_institution_maps')
        .select('*', { count: 'exact', head: true })
        .eq('institution_id', institutionId),
      supabase
        .from('bi_mentor_institution_pool')
        .select('*', { count: 'exact', head: true })
        .eq('institution_id', institutionId),
      supabase
        .from('bi_mentoring_sessions')
        .select('id, match:match_id!inner(id, project_id)')
        .eq('status', 'acknowledged'),
      supabase
        .from('bi_mentor_payouts')
        .select('*', { count: 'exact', head: true })
        .eq('institution_id', institutionId)
        .eq('status', 'pending'),
    ])

    // 기관 정보
    const { data: institution } = await supabase
      .from('bi_institutions')
      .select('id, name, region, type')
      .eq('id', institutionId)
      .single()

    return successResponse({
      institution,
      stats: {
        projects: projectsRes.count || 0,
        mentors: mentorsRes.count || 0,
        completedSessions: sessionsRes.data?.length || 0,
        pendingPayouts: pendingPayoutsRes.count || 0,
      },
    })
  } catch (error) {
    return handleApiError(error)
  }
}
