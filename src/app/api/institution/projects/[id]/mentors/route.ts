import { NextRequest } from 'next/server'
import { requireInstitutionAccess } from '@/lib/auth/institution'
import { createClient } from '@/lib/supabase/server'
import { successResponse, handleApiError } from '@/lib/utils/api-response'

// GET: 프로젝트에 배정된 멘토 목록
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { searchParams } = new URL(request.url)
    await requireInstitutionAccess(searchParams.get('institution_id'))
    const { id: projectId } = await context.params

    const supabase = await createClient()

    const { data: matches, error } = await supabase
      .from('bi_mentor_matches')
      .select('*')
      .eq('project_id', projectId)
      .order('mentor_role')

    if (error) {
      console.error('Project mentors error:', error.message)
    }

    // Fetch mentor user info and profiles separately (FK join not supported by generated types)
    const matchRows = matches || []
    const mentorIds = [...new Set(matchRows.map((m) => m.mentor_id))]

    let mentorMap: Record<string, { id: string; name: string | null; email: string }> = {}
    let profileMap: Record<string, { specialty: string[]; career_summary: string | null }> = {}

    if (mentorIds.length > 0) {
      const [{ data: mentors }, { data: profiles }] = await Promise.all([
        supabase.from('bi_users').select('id, name, email').in('id', mentorIds),
        supabase.from('bi_mentor_profiles').select('user_id, specialty, career_summary').in('user_id', mentorIds),
      ])
      for (const m of mentors || []) {
        mentorMap[m.id] = m
      }
      for (const p of profiles || []) {
        profileMap[p.user_id] = { specialty: p.specialty, career_summary: p.career_summary }
      }
    }

    const enriched = matchRows.map((m) => ({
      ...m,
      mentor: mentorMap[m.mentor_id] || null,
      profile: profileMap[m.mentor_id] || null,
    }))

    return successResponse(enriched)
  } catch (error) {
    return handleApiError(error)
  }
}
