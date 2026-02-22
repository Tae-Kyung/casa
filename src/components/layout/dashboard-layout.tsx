'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import {
  LayoutDashboard,
  FolderKanban,
  Plus,
  Settings,
  LogOut,
  Menu,
  Shield,
  MessageSquare,
  CheckCircle,
  Users,
  Award,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/common/theme-toggle'
import { LocaleSelector } from '@/components/common/locale-selector'
import { MobileDrawer } from '@/components/common/mobile-drawer'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

interface NavItem {
  href: string
  label: string
  icon: React.ReactNode
  roles?: ('user' | 'mentor' | 'admin')[]
}

interface DashboardLayoutProps {
  children: React.ReactNode
  userRole?: 'user' | 'mentor' | 'admin'
}

export function DashboardLayout({ children, userRole = 'user' }: DashboardLayoutProps) {
  const t = useTranslations('nav')
  const tAuth = useTranslations('auth')
  const pathname = usePathname()
  const router = useRouter()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const navItems: NavItem[] = [
    {
      href: '/dashboard',
      label: t('dashboard'),
      icon: <LayoutDashboard className="h-5 w-5" />,
    },
    {
      href: '/projects',
      label: t('projects'),
      icon: <FolderKanban className="h-5 w-5" />,
    },
    {
      href: '/projects/new',
      label: t('newProject'),
      icon: <Plus className="h-5 w-5" />,
    },
    {
      href: '/admin/approvals',
      label: t('approvals'),
      icon: <CheckCircle className="h-5 w-5" />,
      roles: ['mentor', 'admin'],
    },
    {
      href: '/admin/prompts',
      label: t('prompts'),
      icon: <MessageSquare className="h-5 w-5" />,
      roles: ['admin'],
    },
    {
      href: '/admin/users',
      label: t('users'),
      icon: <Users className="h-5 w-5" />,
      roles: ['admin'],
    },
    {
      href: '/admin',
      label: t('admin'),
      icon: <Shield className="h-5 w-5" />,
      roles: ['admin'],
    },
    {
      href: '/showcase',
      label: t('showcase'),
      icon: <Award className="h-5 w-5" />,
    },
    {
      href: '/settings',
      label: t('settings'),
      icon: <Settings className="h-5 w-5" />,
    },
  ]

  const filteredNavItems = navItems.filter(
    (item) => !item.roles || item.roles.includes(userRole)
  )

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    toast.success(tAuth('logoutSuccess'))
    router.push('/login')
    router.refresh()
  }

  const isActive = (href: string) => {
    const pathWithoutLocale = pathname.replace(/^\/[a-z]{2}/, '')
    return pathWithoutLocale === href || pathWithoutLocale.startsWith(`${href}/`)
  }

  const NavContent = () => (
    <nav className="flex flex-col gap-1">
      {filteredNavItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          onClick={() => setMobileMenuOpen(false)}
          className={cn(
            'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
            isActive(item.href)
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
          )}
        >
          {item.icon}
          {item.label}
        </Link>
      ))}
    </nav>
  )

  return (
    <div className="flex min-h-screen">
      {/* Desktop Sidebar */}
      <aside className="hidden w-64 flex-col border-r bg-card p-4 md:flex">
        <div className="mb-8">
          <Link href="/dashboard" className="flex items-center gap-2">
            <span className="text-xl font-bold">CASA</span>
          </Link>
        </div>

        <div className="flex-1">
          <NavContent />
        </div>

        <div className="mt-auto space-y-4">
          <div className="flex items-center justify-center gap-2">
            <ThemeToggle />
            <LocaleSelector />
          </div>
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-muted-foreground"
            onClick={handleLogout}
          >
            <LogOut className="h-5 w-5" />
            {tAuth('logout')}
          </Button>
        </div>
      </aside>

      {/* Mobile Drawer */}
      <MobileDrawer
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        title="CASA"
      >
        <div className="flex h-full flex-col">
          <div className="flex-1">
            <NavContent />
          </div>
          <div className="mt-auto space-y-4">
            <div className="flex items-center justify-center gap-2">
              <ThemeToggle />
              <LocaleSelector />
            </div>
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 text-muted-foreground"
              onClick={handleLogout}
            >
              <LogOut className="h-5 w-5" />
              {tAuth('logout')}
            </Button>
          </div>
        </div>
      </MobileDrawer>

      {/* Main Content */}
      <div className="flex flex-1 flex-col">
        {/* Mobile Header */}
        <header className="flex items-center justify-between border-b p-4 md:hidden">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileMenuOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <Link href="/dashboard" className="text-lg font-bold">
            CASA
          </Link>
          <div className="w-10" /> {/* Spacer for centering */}
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8">{children}</main>
      </div>
    </div>
  )
}
