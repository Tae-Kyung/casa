import { NextRequest } from 'next/server'
import { z } from 'zod'
import { requireMentorMatch } from '@/lib/auth/guards'
import { createServiceClient } from '@/lib/supabase/service'
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api-response'
import type { ProjectStage, FeedbackType } from '@/types/database'

interface RouteContext {
  params: Promise<{ id: string }>
}

const createFeedbackSchema = z.object({
  stage: z.enum(['idea', 'evaluation', 'document', 'deploy', 'done']),
  feedback_type: z.enum(['comment', 'approval', 'rejection', 'revision_request']).default('comment'),
  comment: z.string().min(1).max(5000),
})

// GET: 프로젝트에 대한 멘토 피드백 목록
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params
    const user = await requireMentorMatch(id)

    const supabase = createServiceClient()

    const { data, error } = await supabase
      .from('bi_feedbacks')
      .select('*')
      .eq('project_id', id)
      .eq('feedback_source', 'mentoring')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Mentor feedbacks query error:', error.message)
    }

    // 피드백 작성자 정보 조회
    const feedbacks = data || []
    const userIds = [...new Set(feedbacks.map((f) => f.user_id))]

    let userMap: Record<string, { id: string; name: string | null; email: string }> = {}
    if (userIds.length > 0) {
      const { data: users } = await supabase
        .from('bi_users')
        .select('id, name, email')
        .in('id', userIds)
      for (const u of users || []) {
        userMap[u.id] = u
      }
    }

    // 좋아요 수 및 본인 좋아요 여부 조회
    const feedbackIds = feedbacks.map((f) => f.id)
    let likeCountMap: Record<string, number> = {}
    let myLikeSet = new Set<string>()

    if (feedbackIds.length > 0) {
      // bi_feedback_likes is not in generated types yet, use type assertion
      const likesTable = 'bi_feedback_likes' as unknown as 'bi_feedbacks'
      const [{ data: allLikes }, { data: myLikes }] = await Promise.all([
        supabase
          .from(likesTable)
          .select('feedback_id')
          .in('feedback_id', feedbackIds),
        supabase
          .from(likesTable)
          .select('feedback_id')
          .in('feedback_id', feedbackIds)
          .eq('user_id', user.id),
      ])

      for (const like of (allLikes || []) as unknown as { feedback_id: string }[]) {
        likeCountMap[like.feedback_id] = (likeCountMap[like.feedback_id] || 0) + 1
      }
      for (const like of (myLikes || []) as unknown as { feedback_id: string }[]) {
        myLikeSet.add(like.feedback_id)
      }
    }

    const enriched = feedbacks.map((f) => ({
      ...f,
      author: userMap[f.user_id] || null,
      is_mine: f.user_id === user.id,
      like_count: likeCountMap[f.id] || 0,
      is_liked: myLikeSet.has(f.id),
    }))

    return successResponse(enriched)
  } catch (error) {
    return handleApiError(error)
  }
}

// POST: 멘토 피드백 작성
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params
    const user = await requireMentorMatch(id)

    const body = await request.json()
    const validated = createFeedbackSchema.parse(body)

    const supabase = createServiceClient()

    const { data, error } = await supabase
      .from('bi_feedbacks')
      .insert({
        project_id: id,
        user_id: user.id,
        stage: validated.stage as ProjectStage,
        feedback_type: validated.feedback_type as FeedbackType,
        comment: validated.comment,
        feedback_source: 'mentoring',
      })
      .select()
      .single()

    if (error) {
      console.error('Mentor feedback insert error:', error.message)
      return errorResponse('피드백 작성에 실패했습니다.', 500)
    }

    return successResponse(data, 201)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(error.issues[0].message, 400, 'VALIDATION_ERROR')
    }
    return handleApiError(error)
  }
}
