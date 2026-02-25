'use client'

import { useTranslations } from 'next-intl'
import { ClipboardCheck, Search, Target, FileBarChart, Check, Paperclip } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { useScrollAnimation } from '../hooks/useScrollAnimation'

const stepIcons = [ClipboardCheck, Search, Target, FileBarChart]

export function StartupTrackSection() {
  const t = useTranslations('landing.startup')
  const { ref, isVisible } = useScrollAnimation()

  const steps = [
    { title: t('step1Title'), items: t('step1Items').split('|') },
    { title: t('step2Title'), items: t('step2Items').split('|') },
    { title: t('step3Title'), items: t('step3Items').split('|') },
    { title: t('step4Title'), items: t('step4Items').split('|') },
  ]

  return (
    <section id="startup-track" className="py-20 md:py-24">
      <div ref={ref} className="container mx-auto px-4">
        {/* Header */}
        <div
          className={`text-center mb-6 transition-all duration-700 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <Badge className="mb-4 bg-emerald-500/10 text-emerald-600 border-0 hover:bg-emerald-500/10">
            {t('badge')}
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">{t('title')}</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">{t('subtitle')}</p>
        </div>

        {/* PDF highlight badge */}
        <div
          className={`flex justify-center mb-12 md:mb-16 transition-all duration-700 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
          style={{ transitionDelay: isVisible ? '100ms' : '0ms' }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 text-amber-600 border border-amber-200 dark:border-amber-800 text-sm font-medium">
            <Paperclip className="h-4 w-4" />
            {t('pdfBadge')}
          </div>
        </div>

        {/* 4-step flow */}
        <div className="grid md:grid-cols-4 gap-6 md:gap-4 relative">
          {/* Connection line (desktop) */}
          <div className="hidden md:block absolute top-12 left-[12.5%] right-[12.5%] h-px border-t-2 border-dashed border-emerald-500/30" />

          {steps.map((step, i) => {
            const Icon = stepIcons[i]
            return (
              <div
                key={i}
                className={`relative group transition-all duration-700 ${
                  isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                }`}
                style={{ transitionDelay: isVisible ? `${200 + i * 150}ms` : '0ms' }}
              >
                <div className="rounded-xl border bg-card p-6 hover:border-emerald-500 hover:shadow-md transition-all duration-300">
                  {/* Step number */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="h-8 w-8 rounded-full bg-emerald-600 text-white flex items-center justify-center text-sm font-bold relative z-10">
                      {i + 1}
                    </div>
                    <span className="text-xs text-muted-foreground font-medium uppercase">
                      Step {i + 1}
                    </span>
                  </div>

                  {/* Icon */}
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
                    <Icon className="h-5 w-5 text-emerald-600" />
                  </div>

                  {/* Title */}
                  <h3 className="text-base font-semibold mb-3">{step.title}</h3>

                  {/* Items */}
                  <ul className="space-y-1.5">
                    {step.items.map((item, j) => (
                      <li key={j} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                        <span>{item.trim()}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Arrow between cards (desktop) */}
                {i < 3 && (
                  <div className="hidden md:flex absolute top-1/2 -right-2 z-10 text-emerald-500">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M6 3l5 5-5 5V3z" />
                    </svg>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Footer note */}
        <p
          className={`text-center text-sm text-muted-foreground mt-8 max-w-2xl mx-auto transition-all duration-700 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
          style={{ transitionDelay: isVisible ? '800ms' : '0ms' }}
        >
          {t('footer')}
        </p>
      </div>
    </section>
  )
}
