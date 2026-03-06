import { NextRequest } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/auth/guards'
import { createServiceClient } from '@/lib/supabase/service'
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api-response'

const updateMappingSchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected', 'completed']),
})

interface RouteContext {
  params: Promise<{ id: string }>
}

// PATCH: 매핑 상태 수정
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    await requireAdmin()
    const { id } = await context.params

    const body = await request.json()
    const validatedData = updateMappingSchema.parse(body)

    const supabase = createServiceClient()

    const { data, error } = await supabase
      .from('bi_project_institution_maps')
      .update(validatedData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Mapping update error:', error.message)
      return errorResponse('매핑 수정에 실패했습니다.', 500)
    }

    return successResponse(data)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(error.issues[0].message, 400, 'VALIDATION_ERROR')
    }
    return handleApiError(error)
  }
}
