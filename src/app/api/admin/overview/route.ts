import { NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/auth/guards'
import { createClient } from '@/lib/supabase/server'
import { successResponse, handleApiError } from '@/lib/utils/api-response'

// GET: 전국 현황 통계
export async function GET(request: NextRequest) {
  try {
    await requireAdmin()

    const supabase = await createClient()

    // 병렬 쿼리
    const [
      institutionsResult,
      approvedInstitutionsResult,
      projectsResult,
      mentorsResult,
      approvedMentorsResult,
      usersResult,
      programsResult,
    ] = await Promise.all([
      supabase.from('bi_institutions').select('*', { count: 'exact', head: true }),
      supabase.from('bi_institutions').select('*', { count: 'exact', head: true }).eq('is_approved', true),
      supabase.from('bi_projects').select('*', { count: 'exact', head: true }),
      supabase.from('bi_mentor_profiles').select('*', { count: 'exact', head: true }),
      supabase.from('bi_mentor_profiles').select('*', { count: 'exact', head: true }).eq('is_approved', true),
      supabase.from('bi_users').select('*', { count: 'exact', head: true }).eq('role', 'user'),
      supabase.from('bi_programs').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    ])

    // 기관별 현황
    const { data: institutions } = await supabase
      .from('bi_institutions')
      .select('id, name, region, is_approved')
      .eq('is_approved', true)
      .order('region')

    const institutionStats = await Promise.all(
      (institutions || []).map(async (inst) => {
        const [projectsRes, mentorsRes, sessionsRes] = await Promise.all([
          supabase
            .from('bi_project_institution_maps')
            .select('*', { count: 'exact', head: true })
            .eq('institution_id', inst.id),
          supabase
            .from('bi_mentor_institution_pool')
            .select('*', { count: 'exact', head: true })
            .eq('institution_id', inst.id),
          supabase
            .from('bi_mentoring_sessions')
            .select('id, status')
            .eq('status', 'acknowledged'),
        ])

        return {
          id: inst.id,
          name: inst.name,
          region: inst.region,
          projects: projectsRes.count || 0,
          mentors: mentorsRes.count || 0,
          completedSessions: sessionsRes.data?.length || 0,
        }
      })
    )

    // 승인 대기 통계
    const [pendingMembersResult, pendingMentorsResult, pendingInstitutionsResult] = await Promise.all([
      supabase.from('bi_institution_members').select('*', { count: 'exact', head: true }).eq('is_approved', false),
      supabase.from('bi_mentor_profiles').select('*', { count: 'exact', head: true }).eq('is_approved', false),
      supabase.from('bi_institutions').select('*', { count: 'exact', head: true }).eq('is_approved', false),
    ])

    return successResponse({
      summary: {
        totalInstitutions: institutionsResult.count || 0,
        approvedInstitutions: approvedInstitutionsResult.count || 0,
        totalProjects: projectsResult.count || 0,
        totalMentors: mentorsResult.count || 0,
        approvedMentors: approvedMentorsResult.count || 0,
        totalApplicants: usersResult.count || 0,
        activePrograms: programsResult.count || 0,
      },
      pending: {
        institutions: pendingInstitutionsResult.count || 0,
        members: pendingMembersResult.count || 0,
        mentors: pendingMentorsResult.count || 0,
      },
      institutionStats,
    })
  } catch (error) {
    return handleApiError(error)
  }
}
