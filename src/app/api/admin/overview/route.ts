import { NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/auth/guards'
import { createClient } from '@/lib/supabase/server'
import { successResponse, handleApiError } from '@/lib/utils/api-response'

// GET: 전국 현황 통계
export async function GET(request: NextRequest) {
  try {
    await requireAdmin()

    const supabase = await createClient()

    // 병렬 쿼리 — 기관 관리 기준 수치
    const [
      institutionsResult,
      approvedInstitutionsResult,
      projectMapsResult,
      mentorPoolResult,
      programsResult,
    ] = await Promise.all([
      supabase.from('bi_institutions').select('*', { count: 'exact', head: true }),
      supabase.from('bi_institutions').select('*', { count: 'exact', head: true }).eq('is_approved', true),
      // 기관에 매핑된 프로젝트 수 (중복 제거를 위해 데이터 조회)
      supabase.from('bi_project_institution_maps').select('project_id'),
      // 기관 멘토 풀 소속 멘토 수 (중복 제거를 위해 데이터 조회)
      supabase.from('bi_mentor_institution_pool').select('mentor_id'),
      supabase.from('bi_programs').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    ])

    // 중복 제거한 프로젝트/멘토 수
    const uniqueProjectIds = new Set((projectMapsResult.data || []).map((m) => m.project_id))
    const uniqueMentorIds = new Set((mentorPoolResult.data || []).map((m) => m.mentor_id))

    // 기관 프로젝트 소유자(지원자) 수
    let totalApplicants = 0
    if (uniqueProjectIds.size > 0) {
      const { data: projects } = await supabase
        .from('bi_projects')
        .select('user_id')
        .in('id', [...uniqueProjectIds])
      const uniqueApplicantIds = new Set((projects || []).map((p) => p.user_id))
      totalApplicants = uniqueApplicantIds.size
    }

    // 기관별 현황
    const { data: institutions } = await supabase
      .from('bi_institutions')
      .select('id, name, region, is_approved')
      .eq('is_approved', true)
      .order('region')

    const institutionStats = await Promise.all(
      (institutions || []).map(async (inst) => {
        // 기관의 프로젝트, 멘토 수
        const [projectsRes, mentorsRes] = await Promise.all([
          supabase
            .from('bi_project_institution_maps')
            .select('*', { count: 'exact', head: true })
            .eq('institution_id', inst.id),
          supabase
            .from('bi_mentor_institution_pool')
            .select('*', { count: 'exact', head: true })
            .eq('institution_id', inst.id),
        ])

        // 기관 매칭 기반 완료 세션 수
        const { data: matches } = await supabase
          .from('bi_mentor_matches')
          .select('id')
          .eq('institution_id', inst.id)

        let completedSessions = 0
        const matchIds = (matches || []).map((m) => m.id)
        if (matchIds.length > 0) {
          const { count } = await supabase
            .from('bi_mentoring_sessions')
            .select('*', { count: 'exact', head: true })
            .in('match_id', matchIds)
            .eq('status', 'acknowledged')
          completedSessions = count || 0
        }

        return {
          id: inst.id,
          name: inst.name,
          region: inst.region,
          projects: projectsRes.count || 0,
          mentors: mentorsRes.count || 0,
          completedSessions,
        }
      })
    )

    // 승인 대기 통계 — bi_users 기준으로 멘토 대기 카운트 (bi_mentor_profiles과의 동기화 문제 방지)
    const [pendingMembersResult, pendingMentorsResult, pendingInstitutionsResult] = await Promise.all([
      supabase.from('bi_institution_members').select('*', { count: 'exact', head: true }).eq('is_approved', false),
      supabase.from('bi_users').select('*', { count: 'exact', head: true }).eq('role', 'mentor').eq('is_approved', false),
      supabase.from('bi_institutions').select('*', { count: 'exact', head: true }).eq('is_approved', false),
    ])

    return successResponse({
      summary: {
        totalInstitutions: institutionsResult.count || 0,
        approvedInstitutions: approvedInstitutionsResult.count || 0,
        totalProjects: uniqueProjectIds.size,
        totalMentors: uniqueMentorIds.size,
        approvedMentors: uniqueMentorIds.size,
        totalApplicants,
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
