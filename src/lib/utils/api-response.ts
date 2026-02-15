import { NextResponse } from 'next/server'
import type { ApiResponse, PaginatedData } from '@/types/api'
import { AuthError } from '@/lib/auth/guards'

export function successResponse<T>(data: T, status = 200): NextResponse<ApiResponse<T>> {
  return NextResponse.json({ success: true, data }, { status })
}

export function errorResponse(
  error: string,
  status = 400,
  code?: string
): NextResponse<ApiResponse<never>> {
  return NextResponse.json({ success: false, error, code }, { status })
}

export function paginatedResponse<T>(
  items: T[],
  total: number,
  page: number,
  limit: number
): NextResponse<{ success: true; data: PaginatedData<T> }> {
  return NextResponse.json({
    success: true,
    data: {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  })
}

// 에러 핸들러
export function handleApiError(error: unknown): NextResponse<ApiResponse<never>> {
  console.error('API Error:', error)

  if (error instanceof AuthError) {
    return errorResponse(error.message, error.statusCode, 'AUTH_ERROR')
  }

  if (error instanceof Error) {
    return errorResponse(error.message, 500, 'INTERNAL_ERROR')
  }

  return errorResponse('알 수 없는 오류가 발생했습니다.', 500, 'UNKNOWN_ERROR')
}
