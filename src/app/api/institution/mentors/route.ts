import { NextRequest } from 'next/server'
import { requireInstitutionAccess } from '@/lib/auth/institution'
import { createServiceClient } from '@/lib/supabase/service'
import { handleApiError, paginatedResponse } from '@/lib/utils/api-response'
import { parsePagination } from '@/lib/security/pagination'

// GET: 소속 멘토 목록
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const { institutionId } = await requireInstitutionAccess(searchParams.get('institution_id'))
    const { page, limit } = parsePagination(searchParams)
    const offset = (page - 1) * limit

    const supabase = createServiceClient()

    const { count } = await supabase
      .from('bi_mentor_institution_pool')
      .select('*', { count: 'exact', head: true })
      .eq('institution_id', institutionId)

    const { data, error } = await supabase
      .from('bi_mentor_institution_pool')
      .select('*')
      .eq('institution_id', institutionId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Institution mentors error:', error.message)
    }

    // Fetch mentor user info and profiles separately (FK join not supported by generated types)
    const pool = data || []
    const mentorIds = [...new Set(pool.map((p) => p.mentor_id))]

    let mentorMap: Record<string, { id: string; name: string | null; email: string }> = {}
    let profileMap: Record<string, { specialty: string[]; is_approved: boolean; is_active: boolean }> = {}

    if (mentorIds.length > 0) {
      const [{ data: mentors }, { data: profiles }] = await Promise.all([
        supabase.from('bi_users').select('id, name, email').in('id', mentorIds),
        supabase.from('bi_mentor_profiles').select('user_id, specialty, is_approved, is_active').in('user_id', mentorIds),
      ])
      for (const m of mentors || []) {
        mentorMap[m.id] = m
      }
      for (const p of profiles || []) {
        profileMap[p.user_id] = { specialty: p.specialty, is_approved: p.is_approved, is_active: p.is_active }
      }
    }

    const enriched = pool.map((p) => ({
      ...p,
      mentor: mentorMap[p.mentor_id] || null,
      profile: profileMap[p.mentor_id] || null,
    }))

    return paginatedResponse(enriched, count || 0, page, limit)
  } catch (error) {
    return handleApiError(error)
  }
}
