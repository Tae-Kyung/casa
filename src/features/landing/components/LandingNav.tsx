'use client'

import { useState, useEffect } from 'react'
import { Link } from '@/i18n/navigation'
import { useTranslations } from 'next-intl'
import { Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet'
import { ThemeToggle } from '@/components/common/theme-toggle'
import { LocaleSelector } from '@/components/common/locale-selector'

export function LandingNav() {
  const t = useTranslations('landing')
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const navLinks = [
    { href: '#features', label: t('nav.features') },
    { href: '#process', label: t('nav.process') },
    { href: '#faq', label: t('nav.faq') },
    { href: '/showcase', label: t('nav.showcase'), isRoute: true },
  ]

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 h-16 transition-all duration-300 ${
        scrolled
          ? 'bg-background/80 backdrop-blur-md border-b shadow-sm'
          : 'bg-transparent'
      }`}
    >
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/" className="text-xl font-bold tracking-tight">
          <span className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            CASA
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6">
          {navLinks.map((link) =>
            link.isRoute ? (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                {link.label}
              </Link>
            ) : (
              <a
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                {link.label}
              </a>
            )
          )}
        </nav>

        <div className="hidden md:flex items-center gap-2">
          <ThemeToggle />
          <LocaleSelector />
          <Button variant="ghost" size="sm" asChild>
            <Link href="/login">{t('login')}</Link>
          </Button>
          <Button size="sm" asChild>
            <Link href="/signup">{t('getStarted')}</Link>
          </Button>
        </div>

        {/* Mobile */}
        <div className="flex md:hidden items-center gap-1">
          <ThemeToggle />
          <LocaleSelector />
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[280px]">
              <SheetTitle className="text-lg font-bold">CASA</SheetTitle>
              <nav className="flex flex-col gap-4 mt-6">
                {navLinks.map((link) =>
                  link.isRoute ? (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setOpen(false)}
                      className="text-base font-medium text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {link.label}
                    </Link>
                  ) : (
                    <a
                      key={link.href}
                      href={link.href}
                      onClick={() => setOpen(false)}
                      className="text-base font-medium text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {link.label}
                    </a>
                  )
                )}
                <hr className="my-2" />
                <Button variant="ghost" asChild className="justify-start">
                  <Link href="/login" onClick={() => setOpen(false)}>{t('login')}</Link>
                </Button>
                <Button asChild>
                  <Link href="/signup" onClick={() => setOpen(false)}>{t('getStarted')}</Link>
                </Button>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}
