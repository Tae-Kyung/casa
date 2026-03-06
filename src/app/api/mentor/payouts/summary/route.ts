import { requireMentor } from '@/lib/auth/guards'
import { createServiceClient } from '@/lib/supabase/service'
import { successResponse, handleApiError } from '@/lib/utils/api-response'

// GET: 멘토 수당 요약 조회
export async function GET() {
  try {
    const user = await requireMentor()
    const supabase = createServiceClient()

    // 전체 수당 내역 조회
    const { data: payouts, error } = await supabase
      .from('bi_mentor_payouts')
      .select('amount, status')
      .eq('mentor_id', user.id)

    if (error) {
      console.error('Mentor payouts summary error:', error.message)
    }

    const rows = payouts || []

    const totalAmount = rows.reduce((sum, p) => sum + (p.amount || 0), 0)
    const paidAmount = rows
      .filter((p) => p.status === 'paid')
      .reduce((sum, p) => sum + (p.amount || 0), 0)
    const pendingAmount = rows
      .filter((p) => p.status === 'pending')
      .reduce((sum, p) => sum + (p.amount || 0), 0)
    const approvedAmount = rows
      .filter((p) => p.status === 'approved' || p.status === 'processing')
      .reduce((sum, p) => sum + (p.amount || 0), 0)

    const totalCount = rows.length
    const paidCount = rows.filter((p) => p.status === 'paid').length
    const pendingCount = rows.filter((p) => p.status === 'pending').length
    const approvedCount = rows.filter(
      (p) => p.status === 'approved' || p.status === 'processing'
    ).length
    const cancelledCount = rows.filter((p) => p.status === 'cancelled').length

    return successResponse({
      totalAmount,
      paidAmount,
      pendingAmount,
      approvedAmount,
      totalCount,
      paidCount,
      pendingCount,
      approvedCount,
      cancelledCount,
    })
  } catch (error) {
    return handleApiError(error)
  }
}
