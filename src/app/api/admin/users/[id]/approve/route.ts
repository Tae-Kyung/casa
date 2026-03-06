import { NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/auth/guards'
import { createServiceClient } from '@/lib/supabase/service'
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api-response'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin()
    const { id } = await params
    const { action } = await request.json()

    if (!['approve', 'reject'].includes(action)) {
      return errorResponse('Invalid action', 400)
    }

    const supabase = createServiceClient()

    if (action === 'approve') {
      const { error } = await supabase
        .from('bi_users')
        .update({
          is_approved: true,
          approved_at: new Date().toISOString(),
        })
        .eq('id', id)

      if (error) throw error
      return successResponse({ message: 'User approved' })
    } else {
      // reject: 역할을 user로 되돌리고 미승인 상태 유지
      const { error } = await supabase
        .from('bi_users')
        .update({
          is_approved: false,
          approved_at: null,
        })
        .eq('id', id)

      if (error) throw error
      return successResponse({ message: 'User rejected' })
    }
  } catch (error) {
    return handleApiError(error)
  }
}
