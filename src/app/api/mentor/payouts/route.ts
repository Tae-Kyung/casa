import { NextRequest } from 'next/server'
import { requireMentor } from '@/lib/auth/guards'
import { createClient } from '@/lib/supabase/server'
import { handleApiError, paginatedResponse } from '@/lib/utils/api-response'
import { parsePagination } from '@/lib/security/pagination'
import type { PayoutStatus } from '@/types/database'

// GET: 멘토 수당 지급 내역 조회
export async function GET(request: NextRequest) {
  try {
    const user = await requireMentor()

    const { searchParams } = new URL(request.url)
    const { page, limit } = parsePagination(searchParams)
    const status = searchParams.get('status')
    const offset = (page - 1) * limit

    const supabase = await createClient()

    // 카운트 쿼리
    let countQuery = supabase
      .from('bi_mentor_payouts')
      .select('*', { count: 'exact', head: true })
      .eq('mentor_id', user.id)

    if (status) countQuery = countQuery.eq('status', status as PayoutStatus)

    const { count } = await countQuery

    // 데이터 쿼리
    let dataQuery = supabase
      .from('bi_mentor_payouts')
      .select('*')
      .eq('mentor_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (status) dataQuery = dataQuery.eq('status', status as PayoutStatus)

    const { data, error } = await dataQuery

    if (error) {
      console.error('Mentor payouts query error:', error.message)
    }

    return paginatedResponse(data || [], count || 0, page, limit)
  } catch (error) {
    return handleApiError(error)
  }
}
