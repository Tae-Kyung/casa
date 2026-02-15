import { NextRequest } from 'next/server'
import { requireAuth, requireProjectAccess } from '@/lib/auth/guards'
import { createClient } from '@/lib/supabase/server'
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api-response'
import { z } from 'zod'

interface RouteContext {
  params: Promise<{ id: string }>
}

const feedbackSchema = z.object({
  stage: z.enum(['idea', 'evaluation', 'document', 'deploy', 'done']).optional(),
  gate: z.enum(['gate_1', 'gate_2', 'gate_3', 'gate_4']).optional(),
  comment: z.string().min(10, '피드백은 10자 이상이어야 합니다.'),
  feedback_type: z.enum(['comment', 'approval', 'rejection', 'revision_request']).default('comment'),
})

// GET: 프로젝트 피드백 목록 조회
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params
    await requireProjectAccess(id)

    const supabase = await createClient()

    const { data: feedbacks, error } = await supabase
      .from('bi_feedbacks')
      .select(`
        *,
        author:bi_users!bi_feedbacks_user_id_fkey(id, name, email, role)
      `)
      .eq('project_id', id)
      .order('created_at', { ascending: false })

    if (error) throw error

    return successResponse(feedbacks || [])
  } catch (error) {
    return handleApiError(error)
  }
}

// POST: 피드백 작성 (멘토/관리자만)
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params
    const user = await requireAuth()

    const supabase = await createClient()

    // 사용자 역할 확인
    const { data: userProfile, error: userError } = await supabase
      .from('bi_users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (userError) throw userError

    // 멘토 또는 관리자만 피드백 작성 가능
    if (!userProfile || !['mentor', 'admin'].includes(userProfile.role)) {
      return errorResponse('멘토 또는 관리자만 피드백을 작성할 수 있습니다.', 403)
    }

    // 프로젝트 존재 확인
    const { data: project, error: projectError } = await supabase
      .from('bi_projects')
      .select('id, user_id, current_stage')
      .eq('id', id)
      .single()

    if (projectError || !project) {
      return errorResponse('프로젝트를 찾을 수 없습니다.', 404)
    }

    const body = await request.json()
    const validatedData = feedbackSchema.parse(body)

    // 현재 프로젝트 스테이지 조회
    const stage = validatedData.stage || project.current_stage || 'idea'

    const { data: feedback, error: insertError } = await supabase
      .from('bi_feedbacks')
      .insert({
        project_id: id,
        user_id: user.id,
        stage,
        gate: validatedData.gate || null,
        comment: validatedData.comment,
        feedback_type: validatedData.feedback_type,
      })
      .select()
      .single()

    if (insertError) throw insertError

    return successResponse(feedback, 201)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(error.issues[0]?.message || '유효성 검사 오류', 400)
    }
    return handleApiError(error)
  }
}
