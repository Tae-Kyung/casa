import { setRequestLocale } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DashboardLayout } from '@/components/layout/dashboard-layout'

interface DashboardLayoutWrapperProps {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}

export default async function DashboardLayoutWrapper({
  children,
  params,
}: DashboardLayoutWrapperProps) {
  const { locale } = await params
  setRequestLocale(locale)

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/${locale}/login`)
  }

  // 사용자 역할 조회
  const { data: userProfile } = await supabase
    .from('bi_users')
    .select('role')
    .eq('id', user.id)
    .single()

  const userRole = (userProfile?.role as 'user' | 'mentor' | 'admin') || 'user'

  return <DashboardLayout userRole={userRole}>{children}</DashboardLayout>
}
