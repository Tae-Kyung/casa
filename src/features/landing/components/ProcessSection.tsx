'use client'

import { Link } from '@/i18n/navigation'
import { useTranslations } from 'next-intl'
import { UserPlus, PenTool, Cpu, Rocket, ArrowRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useScrollAnimation } from '../hooks/useScrollAnimation'

const stepIcons = [UserPlus, PenTool, Cpu, Rocket]

export function ProcessSection() {
  const t = useTranslations('landing.process')
  const { ref, isVisible } = useScrollAnimation()

  const steps = [
    { title: t('step1Title'), time: t('step1Time'), desc: t('step1Desc') },
    { title: t('step2Title'), time: t('step2Time'), desc: t('step2Desc') },
    { title: t('step3Title'), time: t('step3Time'), desc: t('step3Desc') },
    { title: t('step4Title'), time: t('step4Time'), desc: t('step4Desc') },
  ]

  return (
    <section id="process" className="py-20 md:py-24">
      <div ref={ref} className="container mx-auto px-4">
        <div
          className={`text-center mb-12 md:mb-16 transition-all duration-700 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">{t('title')}</h2>
          <p className="text-lg text-muted-foreground">{t('subtitle')}</p>
        </div>

        <div className="grid md:grid-cols-4 gap-6 md:gap-8 relative">
          {/* Connection line (desktop) */}
          <div className="hidden md:block absolute top-10 left-[12.5%] right-[12.5%] h-px border-t-2 border-dashed border-primary/30" />

          {steps.map((step, i) => {
            const Icon = stepIcons[i]
            return (
              <div
                key={i}
                className={`relative text-center transition-all duration-700 ${
                  isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                }`}
                style={{ transitionDelay: isVisible ? `${i * 150}ms` : '0ms' }}
              >
                {/* Step number */}
                <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-sm relative z-10">
                  {i + 1}
                </div>
                {/* Time badge */}
                <Badge variant="secondary" className="mb-3 text-xs">
                  {step.time}
                </Badge>
                {/* Icon */}
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                  <Icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-base font-semibold mb-2">{step.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
              </div>
            )
          })}
        </div>

        {/* Bottom CTA */}
        <div
          className={`text-center mt-12 space-y-3 transition-all duration-700 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
          style={{ transitionDelay: isVisible ? '600ms' : '0ms' }}
        >
          <Button size="lg" className="h-12 px-8" asChild>
            <Link href="/signup">
              {t('cta')}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <p className="text-sm text-muted-foreground">{t('totalTime')}</p>
        </div>
      </div>
    </section>
  )
}
