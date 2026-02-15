import { createClient } from '@/lib/supabase/server'
import type { User, UserRole } from '@/types/database'

export class AuthError extends Error {
  constructor(
    message: string,
    public statusCode: number = 401
  ) {
    super(message)
    this.name = 'AuthError'
  }
}

// 인증 필수
export async function requireAuth(): Promise<User> {
  const supabase = await createClient()

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    throw new AuthError('인증이 필요합니다.', 401)
  }

  // bi_users 테이블에서 사용자 정보 조회
  const { data: dbUser, error: dbError } = await supabase
    .from('bi_users')
    .select('*')
    .eq('id', user.id)
    .single()

  if (dbError || !dbUser) {
    throw new AuthError('사용자 정보를 찾을 수 없습니다.', 404)
  }

  return dbUser
}

// 리소스 소유자 확인
export async function requireOwner(resourceUserId: string): Promise<User> {
  const user = await requireAuth()

  if (user.id !== resourceUserId) {
    throw new AuthError('접근 권한이 없습니다.', 403)
  }

  return user
}

// 특정 역할 필수
export async function requireRole(allowedRoles: UserRole[]): Promise<User> {
  const user = await requireAuth()

  if (!allowedRoles.includes(user.role)) {
    throw new AuthError('접근 권한이 없습니다.', 403)
  }

  return user
}

// 관리자 필수
export async function requireAdmin(): Promise<User> {
  return requireRole(['admin'])
}

// 멘토 이상 필수
export async function requireMentor(): Promise<User> {
  return requireRole(['mentor', 'admin'])
}

// 프로젝트 소유자 확인
export async function requireProjectOwner(projectId: string): Promise<User> {
  const supabase = await createClient()
  const user = await requireAuth()

  const { data: project, error } = await supabase
    .from('bi_projects')
    .select('user_id')
    .eq('id', projectId)
    .single()

  if (error || !project) {
    throw new AuthError('프로젝트를 찾을 수 없습니다.', 404)
  }

  if (project.user_id !== user.id) {
    throw new AuthError('프로젝트에 대한 접근 권한이 없습니다.', 403)
  }

  return user
}

// 프로젝트 접근 권한 확인 (소유자 또는 멘토/관리자)
export async function requireProjectAccess(projectId: string): Promise<User> {
  const supabase = await createClient()
  const user = await requireAuth()

  const { data: project, error } = await supabase
    .from('bi_projects')
    .select('user_id')
    .eq('id', projectId)
    .single()

  if (error || !project) {
    throw new AuthError('프로젝트를 찾을 수 없습니다.', 404)
  }

  // 소유자, 멘토, 관리자는 접근 가능
  if (project.user_id === user.id || ['mentor', 'admin'].includes(user.role)) {
    return user
  }

  throw new AuthError('프로젝트에 대한 접근 권한이 없습니다.', 403)
}
