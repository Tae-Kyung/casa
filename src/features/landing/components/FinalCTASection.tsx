'use client'

import { Link } from '@/i18n/navigation'
import { useTranslations } from 'next-intl'
import { ArrowRight, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useScrollAnimation } from '../hooks/useScrollAnimation'

export function FinalCTASection() {
  const t = useTranslations('landing.finalCta')
  const { ref, isVisible } = useScrollAnimation()

  const badges = [t('badge1'), t('badge2'), t('badge3')]

  return (
    <section className="py-20 md:py-24 bg-gradient-to-br from-primary/10 via-background to-emerald-500/10">
      <div ref={ref} className="container mx-auto px-4">
        <div
          className={`max-w-3xl mx-auto text-center space-y-8 transition-all duration-700 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <h2 className="text-3xl md:text-4xl lg:text-[40px] font-bold leading-tight">
            {t('title')}
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground">
            {t('subtitle')}
          </p>

          {/* Two track CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              size="lg"
              className="h-14 px-8 text-base hover:scale-[1.02] hover:shadow-xl transition-all"
              asChild
            >
              <Link href="/signup?track=pre_startup">
                {t('preStartupCta')}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button
              size="lg"
              className="h-14 px-8 text-base bg-emerald-600 hover:bg-emerald-700 text-white hover:scale-[1.02] hover:shadow-xl transition-all"
              asChild
            >
              <Link href="/signup?track=startup">
                {t('startupCta')}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>

          <p className="text-sm text-muted-foreground">
            {t('loginText')}{' '}
            <Link href="/login" className="text-primary hover:underline font-medium">
              {t('loginLink')}
            </Link>
          </p>

          <div className="flex flex-wrap justify-center gap-x-6 gap-y-3 text-sm text-muted-foreground">
            {badges.map((badge) => (
              <span key={badge} className="flex items-center gap-1.5">
                <Check className="h-4 w-4 text-green-500" />
                {badge}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
