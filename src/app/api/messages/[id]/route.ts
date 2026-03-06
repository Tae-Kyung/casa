import { NextRequest } from 'next/server'
import { requireMessageAccess } from '@/lib/auth/guards'
import { createServiceClient } from '@/lib/supabase/service'
import { successResponse, handleApiError } from '@/lib/utils/api-response'

// GET: 메시지 상세 (쓰레드 포함)
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    await requireMessageAccess(id)

    const supabase = createServiceClient()

    // 원본 메시지
    const { data: message } = await supabase
      .from('bi_messages')
      .select('*, sender:sender_id(id, name, email), recipient:recipient_id(id, name, email)')
      .eq('id', id)
      .single()

    // 쓰레드 (답장들)
    const { data: replies } = await supabase
      .from('bi_messages')
      .select('*, sender:sender_id(id, name, email)')
      .eq('thread_id', id)
      .order('created_at', { ascending: true })

    return successResponse({
      ...message,
      replies: replies || [],
    })
  } catch (error) {
    return handleApiError(error)
  }
}
