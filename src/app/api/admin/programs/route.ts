import { NextRequest } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/auth/guards'
import { createClient } from '@/lib/supabase/server'
import { successResponse, errorResponse, handleApiError, paginatedResponse } from '@/lib/utils/api-response'
import { parsePagination } from '@/lib/security/pagination'
import type { ProgramStatus } from '@/types/database'

const createProgramSchema = z.object({
  name: z.string().min(1).max(200),
  year: z.number().int().min(2020).max(2030),
  round: z.number().int().min(1).default(1),
  description: z.string().nullable().optional(),
  start_date: z.string().nullable().optional(),
  end_date: z.string().nullable().optional(),
})

// GET: 프로그램 목록
export async function GET(request: NextRequest) {
  try {
    await requireAdmin()

    const { searchParams } = new URL(request.url)
    const { page, limit } = parsePagination(searchParams)
    const status = searchParams.get('status')
    const offset = (page - 1) * limit

    const supabase = await createClient()

    let countQuery = supabase
      .from('bi_programs')
      .select('*', { count: 'exact', head: true })

    if (status) countQuery = countQuery.eq('status', status as ProgramStatus)

    const { count } = await countQuery

    let dataQuery = supabase
      .from('bi_programs')
      .select('*')
      .order('year', { ascending: false })
      .order('round', { ascending: false })
      .range(offset, offset + limit - 1)

    if (status) dataQuery = dataQuery.eq('status', status as ProgramStatus)

    const { data, error } = await dataQuery

    if (error) {
      console.error('Programs query error:', error.message)
      return errorResponse('프로그램 목록을 불러오는데 실패했습니다.', 500)
    }

    return paginatedResponse(data || [], count || 0, page, limit)
  } catch (error) {
    return handleApiError(error)
  }
}

// POST: 프로그램 생성
export async function POST(request: NextRequest) {
  try {
    await requireAdmin()

    const body = await request.json()
    const validatedData = createProgramSchema.parse(body)

    const supabase = await createClient()

    const { data, error } = await supabase
      .from('bi_programs')
      .insert(validatedData)
      .select()
      .single()

    if (error) {
      console.error('Program insert error:', error.message)
      return errorResponse('프로그램 생성에 실패했습니다.', 500)
    }

    return successResponse(data, 201)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(error.issues[0].message, 400, 'VALIDATION_ERROR')
    }
    return handleApiError(error)
  }
}
