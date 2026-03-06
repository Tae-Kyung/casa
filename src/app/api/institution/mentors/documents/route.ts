import { NextRequest } from 'next/server'
import { requireInstitutionAccess } from '@/lib/auth/institution'
import { createServiceClient } from '@/lib/supabase/service'
import { successResponse, handleApiError } from '@/lib/utils/api-response'

// GET: 기관 소속 멘토들의 증빙 서류 목록 일괄 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const { institutionId } = await requireInstitutionAccess(searchParams.get('institution_id'))

    const supabase = createServiceClient()

    // 기관 소속 멘토 목록 조회
    const { data: poolEntries } = await supabase
      .from('bi_mentor_institution_pool')
      .select('mentor_id')
      .eq('institution_id', institutionId)

    const mentorIds = (poolEntries || []).map((p) => p.mentor_id)

    if (mentorIds.length === 0) {
      return successResponse([])
    }

    // 멘토 프로필 (서류 URL) 조회 — select('*')로 조회 후 cast
    const { data: profiles } = await supabase
      .from('bi_mentor_profiles')
      .select('*')
      .in('user_id', mentorIds)

    // 멘토 기본 정보 조회
    const { data: users } = await supabase
      .from('bi_users')
      .select('id, name, email')
      .in('id', mentorIds)

    const userMap: Record<string, { name: string | null; email: string }> = {}
    for (const u of users || []) {
      userMap[u.id] = { name: u.name, email: u.email }
    }

    const result = (profiles || []).map((row) => {
      const p = row as Record<string, unknown>
      const userId = p.user_id as string
      return {
        mentor_id: userId,
        name: userMap[userId]?.name || null,
        email: userMap[userId]?.email || '',
        resume_url: (p.resume_url as string) || null,
        bank_account_url: (p.bank_account_url as string) || null,
        privacy_consent_url: (p.privacy_consent_url as string) || null,
        documents_complete: !!(p.resume_url && p.bank_account_url && p.privacy_consent_url),
      }
    })

    return successResponse(result)
  } catch (error) {
    return handleApiError(error)
  }
}
