'use client'

import { useTranslations } from 'next-intl'
import { PenTool, BarChart3, FileText, Rocket, ArrowRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { useScrollAnimation } from '../hooks/useScrollAnimation'

const stepIcons = [PenTool, BarChart3, FileText, Rocket]

export function SolutionOverview() {
  const t = useTranslations('landing.solution')
  const { ref, isVisible } = useScrollAnimation()

  const steps = [
    { title: t('step1Title'), desc: t('step1Desc'), tags: t('step1Tags') },
    { title: t('step2Title'), desc: t('step2Desc'), tags: t('step2Tags') },
    { title: t('step3Title'), desc: t('step3Desc'), tags: t('step3Tags') },
    { title: t('step4Title'), desc: t('step4Desc'), tags: t('step4Tags') },
  ]

  return (
    <section className="py-20 md:py-24">
      <div ref={ref} className="container mx-auto px-4">
        <div
          className={`text-center mb-12 md:mb-16 transition-all duration-700 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">{t('title')}</h2>
          <p className="text-lg text-muted-foreground">{t('subtitle')}</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6">
          {steps.map((step, i) => {
            const Icon = stepIcons[i]
            return (
              <div key={i} className="relative">
                <div
                  className={`rounded-xl border bg-card p-6 text-center transition-all duration-700 hover:shadow-md hover:-translate-y-1 h-full ${
                    isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                  }`}
                  style={{ transitionDelay: isVisible ? `${i * 150}ms` : '0ms' }}
                >
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-lg">
                    {i + 1}
                  </div>
                  <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-base font-semibold mb-2">{step.title}</h3>
                  <p className="text-sm text-muted-foreground mb-3">{step.desc}</p>
                  <div className="flex flex-wrap justify-center gap-1">
                    {step.tags.split(' · ').map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
                {/* Arrow between steps (desktop only) */}
                {i < 3 && (
                  <div className="hidden md:flex absolute top-1/2 -right-5 -translate-y-1/2 z-10">
                    <ArrowRight className="h-5 w-5 text-muted-foreground/40" />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
