'use client'

import Image from 'next/image'
import { Link } from '@/i18n/navigation'
import { useTranslations } from 'next-intl'
import { ArrowRight, Zap, BarChart3, Rocket, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export function HeroSection() {
  const t = useTranslations('landing')

  const trustItems = [
    { icon: Zap, text: t('hero.trust1') },
    { icon: BarChart3, text: t('hero.trust2') },
    { icon: Rocket, text: t('hero.trust3') },
  ]

  const bottomItems = [t('hero.bottom1'), t('hero.bottom2'), t('hero.bottom3')]

  return (
    <section className="relative min-h-[100dvh] flex items-center pt-16">
      {/* Background pattern */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_1px_1px,_theme(colors.primary/0.05)_1px,_transparent_0)] [background-size:24px_24px]" />

      <div className="container mx-auto px-4 py-10 md:py-20">
        <div className="grid lg:grid-cols-5 gap-12 items-center">
          {/* Left: Text content */}
          <div className="lg:col-span-3 space-y-5 md:space-y-8">
            <Badge variant="secondary" className="px-4 py-1.5 text-sm font-medium">
              {t('hero.badge')}
            </Badge>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-tight">
              {t('hero.titleLine1')}
              <br />
              <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                {t('hero.titleLine2')}
              </span>
            </h1>

            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl leading-relaxed">
              {t('hero.subtitle')}
            </p>

            {/* Trust badges */}
            <div className="flex flex-wrap gap-3">
              {trustItems.map((item) => (
                <div
                  key={item.text}
                  className="flex items-center gap-2 rounded-full bg-muted/60 px-4 py-2 text-sm"
                >
                  <item.icon className="h-4 w-4 text-primary" />
                  <span className="font-medium">{item.text}</span>
                </div>
              ))}
            </div>

            {/* CTA buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Button size="lg" className="h-12 px-8 text-base" asChild>
                <Link href="/signup">
                  {t('hero.cta')}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="h-12 px-8 text-base" asChild>
                <a href="#features">{t('hero.ctaSecondary')}</a>
              </Button>
            </div>

            {/* Bottom trust text */}
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
              {bottomItems.map((item) => (
                <span key={item} className="flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5 text-green-500" />
                  {item}
                </span>
              ))}
            </div>
          </div>

          {/* Right: Hero illustration */}
          <div className="lg:col-span-2 hidden lg:block">
            <div className="relative">
              <Image
                src="/images/landing/hero-dashboard.png"
                alt="CASA AI Dashboard"
                width={600}
                height={400}
                className="rounded-2xl shadow-2xl"
                priority
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
