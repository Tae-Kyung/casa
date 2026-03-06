import { NextRequest } from 'next/server'
import { requireInstitutionAccess } from '@/lib/auth/institution'
import { createClient } from '@/lib/supabase/server'
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api-response'

// POST: 보고서 확인(승인)
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { searchParams } = new URL(request.url)
    const { user } = await requireInstitutionAccess(searchParams.get('institution_id'))
    const { id } = await context.params

    const supabase = await createClient()

    const { error } = await supabase
      .from('bi_mentoring_reports')
      .update({
        status: 'confirmed',
        confirmed_by: user.id,
        confirmed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (error) {
      console.error('Report confirm error:', error.message)
      return errorResponse('보고서 확인에 실패했습니다.', 500)
    }

    return successResponse({ message: '보고서가 확인되었습니다.' })
  } catch (error) {
    return handleApiError(error)
  }
}
