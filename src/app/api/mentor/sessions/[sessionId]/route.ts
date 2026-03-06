import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth/guards'
import { createClient } from '@/lib/supabase/server'
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api-response'
import { z } from 'zod'

interface RouteContext {
  params: Promise<{ sessionId: string }>
}

const updateSessionSchema = z.object({
  comments: z.any().optional(),
  revision_summary: z.string().optional(),
  session_date: z.string().optional(),
  duration_minutes: z.number().int().positive().optional(),
})

// PATCH: 멘토링 세션 수정
export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { sessionId } = await context.params
    const user = await requireAuth()

    const supabase = await createClient()

    // 세션 조회
    const { data: session, error: sessionError } = await supabase
      .from('bi_mentoring_sessions')
      .select('*')
      .eq('id', sessionId)
      .single()

    if (sessionError || !session) {
      return errorResponse('멘토링 세션을 찾을 수 없습니다.', 404)
    }

    // 해당 세션의 매칭이 현재 사용자(멘토)의 것인지 확인
    const { data: match, error: matchError } = await supabase
      .from('bi_mentor_matches')
      .select('id')
      .eq('id', session.match_id)
      .eq('mentor_id', user.id)
      .single()

    if (matchError || !match) {
      return errorResponse('해당 세션에 대한 수정 권한이 없습니다.', 403)
    }

    // draft 상태에서만 수정 가능
    if (session.status !== 'draft') {
      return errorResponse('제출된 세션은 수정할 수 없습니다.', 400)
    }

    const body = await request.json()
    const validatedData = updateSessionSchema.parse(body)

    const { data: updated, error: updateError } = await supabase
      .from('bi_mentoring_sessions')
      .update({
        ...validatedData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', sessionId)
      .select()
      .single()

    if (updateError) throw updateError

    return successResponse(updated)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(error.issues[0]?.message || '유효성 검사 오류', 400)
    }
    return handleApiError(error)
  }
}
