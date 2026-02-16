import { requireMentor } from '@/lib/auth/guards'
import { createClient } from '@/lib/supabase/server'
import { successResponse, handleApiError } from '@/lib/utils/api-response'

export async function GET() {
  try {
    await requireMentor()

    const supabase = await createClient()

    // 병렬 쿼리 실행
    const [
      usersResult,
      projectsResult,
      approvalsResult,
      documentsResult,
      recentUsersResult,
    ] = await Promise.all([
      // 전체 사용자 수 + 역할별
      supabase.from('bi_users').select('role'),
      // 전체 프로젝트 수 + 단계별
      supabase.from('bi_projects').select('current_stage'),
      // 승인 대기 건수
      supabase
        .from('bi_approvals')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending'),
      // 문서 통계
      supabase.from('bi_documents').select('is_confirmed'),
      // 최근 가입자 5명
      supabase
        .from('bi_users')
        .select('id, name, email, role, created_at')
        .order('created_at', { ascending: false })
        .limit(5),
    ])

    // 사용자 통계
    const users = usersResult.data || []
    const userStats = {
      total: users.length,
      byRole: {
        user: users.filter((u) => u.role === 'user').length,
        mentor: users.filter((u) => u.role === 'mentor').length,
        admin: users.filter((u) => u.role === 'admin').length,
      },
    }

    // 프로젝트 통계
    const projects = projectsResult.data || []
    const projectStats = {
      total: projects.length,
      byStage: {
        idea: projects.filter((p) => p.current_stage === 'idea').length,
        evaluation: projects.filter((p) => p.current_stage === 'evaluation').length,
        document: projects.filter((p) => p.current_stage === 'document').length,
        deploy: projects.filter((p) => p.current_stage === 'deploy').length,
        done: projects.filter((p) => p.current_stage === 'done').length,
      },
    }

    // 문서 통계
    const documents = documentsResult.data || []
    const documentStats = {
      total: documents.length,
      confirmed: documents.filter((d) => d.is_confirmed).length,
    }

    return successResponse({
      users: userStats,
      projects: projectStats,
      pendingApprovals: approvalsResult.count || 0,
      documents: documentStats,
      recentUsers: recentUsersResult.data || [],
    })
  } catch (error) {
    return handleApiError(error)
  }
}
