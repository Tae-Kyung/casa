'use client'

import { Link } from '@/i18n/navigation'
import { useTranslations } from 'next-intl'
import {
  ArrowRight,
  Lightbulb,
  ClipboardList,
  Check,
  ChevronRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useScrollAnimation } from '../hooks/useScrollAnimation'

export function HeroSection() {
  const t = useTranslations('landing')
  const { ref, isVisible } = useScrollAnimation({ threshold: 0.05 })

  const trustItems = [t('hero.trust1'), t('hero.trust2'), t('hero.trust3')]

  return (
    <section className="relative min-h-[100dvh] flex items-center pt-16">
      {/* Background pattern */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_1px_1px,_theme(colors.primary/0.03)_1px,_transparent_0)] [background-size:24px_24px]" />
      {/* Gradient blob */}
      <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-primary/5 blur-3xl pointer-events-none" />

      <div ref={ref} className="container mx-auto px-4 py-10 md:py-20">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          {/* Badge */}
          <div
            className={`transition-all duration-700 ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
          >
            <Badge
              variant="secondary"
              className="px-4 py-1.5 text-sm font-medium bg-primary/10 text-primary border-0"
            >
              {t('hero.badge')}
            </Badge>
          </div>

          {/* Headline */}
          <h1
            className={`text-4xl md:text-5xl lg:text-[60px] font-bold tracking-tight leading-tight transition-all duration-700 ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
            style={{ transitionDelay: isVisible ? '100ms' : '0ms' }}
          >
            {t('hero.titleLine1')}
            <br />
            <span className="bg-gradient-to-r from-primary to-emerald-500 bg-clip-text text-transparent">
              {t('hero.titleLine2')}
            </span>
          </h1>

          {/* Subtitle */}
          <p
            className={`text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed transition-all duration-700 ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
            style={{ transitionDelay: isVisible ? '200ms' : '0ms' }}
          >
            {t('hero.subtitle')}
          </p>

          {/* Track selection cards */}
          <div
            className={`grid md:grid-cols-2 gap-6 max-w-3xl mx-auto transition-all duration-700 ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
            style={{ transitionDelay: isVisible ? '400ms' : '0ms' }}
          >
            {/* Pre-founder track card */}
            <div className="group bg-card border-2 border-border rounded-2xl p-6 md:p-8 text-left hover:border-primary hover:shadow-lg transition-all duration-300 hover:scale-[1.02]">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Lightbulb className="h-5 w-5 text-primary" />
                </div>
                <h3 className="text-lg font-bold">{t('hero.trackPreTitle')}</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                {t('hero.trackPreDesc')}
              </p>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-5">
                <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                  {t('hero.trackPreFlow')}
                </span>
              </div>
              <Button className="w-full group-hover:bg-primary" asChild>
                <Link href="/signup?track=pre_startup">
                  {t('hero.trackPreCta')}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>

            {/* Founder track card */}
            <div className="group bg-card border-2 border-border rounded-2xl p-6 md:p-8 text-left hover:border-emerald-500 hover:shadow-lg transition-all duration-300 hover:scale-[1.02]">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                  <ClipboardList className="h-5 w-5 text-emerald-600" />
                </div>
                <h3 className="text-lg font-bold">{t('hero.trackStartupTitle')}</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                {t('hero.trackStartupDesc')}
              </p>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-5">
                <span className="bg-emerald-500/10 text-emerald-600 px-2 py-0.5 rounded-full font-medium">
                  {t('hero.trackStartupFlow')}
                </span>
              </div>
              <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white" asChild>
                <Link href="/signup?track=startup">
                  {t('hero.trackStartupCta')}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>

          {/* Trust items */}
          <div
            className={`flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground transition-all duration-700 ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
            style={{ transitionDelay: isVisible ? '600ms' : '0ms' }}
          >
            {trustItems.map((item) => (
              <span key={item} className="flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 text-green-500" />
                {item}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <ChevronRight className="h-5 w-5 text-muted-foreground/50 rotate-90" />
      </div>
    </section>
  )
}
