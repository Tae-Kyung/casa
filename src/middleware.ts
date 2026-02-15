import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import createMiddleware from 'next-intl/middleware'
import { routing } from './i18n/routing'

// 인증이 필요 없는 경로
const publicPaths = ['/login', '/signup', '/auth/callback', '/forgot-password']

// 관리자만 접근 가능한 경로
const adminPaths = ['/admin']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 정적 파일 및 API 라우트 제외
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.')
  ) {
    return NextResponse.next()
  }

  // next-intl 미들웨어 적용
  const handleI18nRouting = createMiddleware(routing)
  const response = handleI18nRouting(request)

  // Supabase 세션 갱신 — 기존 i18n 응답에 쿠키만 추가
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // 경로에서 로케일 제거
  const pathWithoutLocale = pathname.replace(/^\/(ko|en)/, '') || '/'

  // 공개 경로 체크
  const isPublicPath = publicPaths.some((p) => pathWithoutLocale.startsWith(p))

  // 인증되지 않은 사용자가 보호된 경로 접근 시
  if (!user && !isPublicPath && pathWithoutLocale !== '/') {
    const locale = pathname.split('/')[1] || 'ko'
    const url = request.nextUrl.clone()
    url.pathname = `/${locale}/login`
    return NextResponse.redirect(url)
  }

  // 인증된 사용자가 로그인/회원가입 페이지 접근 시
  if (user && isPublicPath) {
    const locale = pathname.split('/')[1] || 'ko'
    const url = request.nextUrl.clone()
    url.pathname = `/${locale}/dashboard`
    return NextResponse.redirect(url)
  }

  // 관리자 경로 체크 - bi_users에서 역할 검증
  if (user && adminPaths.some((p) => pathWithoutLocale.startsWith(p))) {
    const { data: userData } = await supabase
      .from('bi_users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!userData || (userData.role !== 'admin' && userData.role !== 'mentor')) {
      const locale = pathname.split('/')[1] || 'ko'
      const url = request.nextUrl.clone()
      url.pathname = `/${locale}/dashboard`
      return NextResponse.redirect(url)
    }
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)'],
}
