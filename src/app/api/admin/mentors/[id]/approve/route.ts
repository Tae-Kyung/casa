import { NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/auth/guards'
import { createClient } from '@/lib/supabase/server'
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api-response'
import { logAudit, extractRequestInfo } from '@/lib/security/audit'

// POST: 멘토 승인
export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin()
    const { id } = await context.params

    const supabase = await createClient()

    // 멘토 프로필 승인
    const { error: profileError } = await supabase
      .from('bi_mentor_profiles')
      .update({
        is_approved: true,
        approved_at: new Date().toISOString(),
        approved_by: admin.id,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', id)

    if (profileError) {
      console.error('Mentor approve error:', profileError.message)
      return errorResponse('멘토 승인에 실패했습니다.', 500)
    }

    // 사용자 계정도 승인
    await supabase
      .from('bi_users')
      .update({
        is_approved: true,
        approved_at: new Date().toISOString(),
      })
      .eq('id', id)

    const { ipAddress, userAgent } = extractRequestInfo(request)
    await logAudit({
      userId: admin.id,
      action: 'mentor_approve',
      resourceType: 'mentor',
      resourceId: id,
      ipAddress,
      userAgent,
    })

    return successResponse({ message: '멘토가 승인되었습니다.' })
  } catch (error) {
    return handleApiError(error)
  }
}
