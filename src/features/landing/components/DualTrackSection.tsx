'use client'

import { useTranslations } from 'next-intl'
import {
  Lightbulb,
  ClipboardList,
  ArrowRight,
  Check,
  Users,
  FileInput,
  Workflow,
  Gift,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useScrollAnimation } from '../hooks/useScrollAnimation'

export function DualTrackSection() {
  const t = useTranslations('landing.dualTrack')
  const { ref, isVisible } = useScrollAnimation()

  const preSteps = [t('preStep1'), t('preStep2'), t('preStep3'), t('preStep4')]
  const preResults = [t('preResult1'), t('preResult2'), t('preResult3'), t('preResult4'), t('preResult5')]

  const startupSteps = [t('startupStep1'), t('startupStep2'), t('startupStep3'), t('startupStep4')]
  const startupResults = [t('startupResult1'), t('startupResult2'), t('startupResult3'), t('startupResult4')]

  return (
    <section id="tracks" className="py-20 md:py-24">
      <div ref={ref} className="container mx-auto px-4">
        {/* Header */}
        <div
          className={`text-center mb-12 md:mb-16 transition-all duration-700 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">{t('title')}</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">{t('subtitle')}</p>
        </div>

        {/* Two track cards */}
        <div
          className={`grid lg:grid-cols-2 gap-6 md:gap-8 transition-all duration-700 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
          style={{ transitionDelay: isVisible ? '200ms' : '0ms' }}
        >
          {/* Pre-founder track */}
          <div className="group border-2 border-border rounded-2xl p-6 md:p-8 lg:p-10 bg-card hover:border-primary hover:shadow-xl transition-all duration-300">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Lightbulb className="h-5 w-5 text-primary" />
              </div>
              <span className="text-sm font-semibold text-primary">{t('preLabel')}</span>
            </div>
            <h3 className="text-xl font-bold mb-4">{t('preMotto')}</h3>

            {/* Target */}
            <div className="mb-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                <Users className="h-3.5 w-3.5" />
                {t('targetLabel')}
              </div>
              <p className="text-sm text-muted-foreground">{t('preTarget')}</p>
            </div>

            {/* Input */}
            <div className="mb-5">
              <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                <FileInput className="h-3.5 w-3.5" />
                {t('inputLabel')}
              </div>
              <p className="text-sm text-muted-foreground">{t('preInput')}</p>
            </div>

            {/* Workflow steps */}
            <div className="mb-5">
              <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                <Workflow className="h-3.5 w-3.5" />
                {t('flowLabel')}
              </div>
              <div className="space-y-2">
                {preSteps.map((step, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0">
                      {i + 1}
                    </div>
                    <span className="text-sm">{step}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Results */}
            <div className="mb-6">
              <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                <Gift className="h-3.5 w-3.5" />
                {t('resultLabel')}
              </div>
              <div className="space-y-1.5">
                {preResults.map((result, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-primary shrink-0" />
                    <span>{result}</span>
                  </div>
                ))}
              </div>
            </div>

            <Button className="w-full" variant="outline" asChild>
              <a href="#pre-startup-track">
                {t('preCta')}
                <ArrowRight className="ml-2 h-4 w-4" />
              </a>
            </Button>
          </div>

          {/* Founder track */}
          <div className="group border-2 border-border rounded-2xl p-6 md:p-8 lg:p-10 bg-card hover:border-emerald-500 hover:shadow-xl transition-all duration-300">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <ClipboardList className="h-5 w-5 text-emerald-600" />
              </div>
              <span className="text-sm font-semibold text-emerald-600">{t('startupLabel')}</span>
            </div>
            <h3 className="text-xl font-bold mb-4">{t('startupMotto')}</h3>

            {/* Target */}
            <div className="mb-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                <Users className="h-3.5 w-3.5" />
                {t('targetLabel')}
              </div>
              <p className="text-sm text-muted-foreground">{t('startupTarget')}</p>
            </div>

            {/* Input */}
            <div className="mb-5">
              <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                <FileInput className="h-3.5 w-3.5" />
                {t('inputLabel')}
              </div>
              <p className="text-sm text-muted-foreground">{t('startupInput')}</p>
            </div>

            {/* Workflow steps */}
            <div className="mb-5">
              <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                <Workflow className="h-3.5 w-3.5" />
                {t('flowLabel')}
              </div>
              <div className="space-y-2">
                {startupSteps.map((step, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="h-6 w-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                      {i + 1}
                    </div>
                    <span className="text-sm">{step}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Results */}
            <div className="mb-6">
              <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                <Gift className="h-3.5 w-3.5" />
                {t('resultLabel')}
              </div>
              <div className="space-y-1.5">
                {startupResults.map((result, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>{result}</span>
                  </div>
                ))}
              </div>
            </div>

            <Button
              className="w-full border-emerald-500 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
              variant="outline"
              asChild
            >
              <a href="#startup-track">
                {t('startupCta')}
                <ArrowRight className="ml-2 h-4 w-4" />
              </a>
            </Button>
          </div>
        </div>

        {/* Bottom note */}
        <p
          className={`text-center text-sm text-muted-foreground mt-8 transition-all duration-700 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
          style={{ transitionDelay: isVisible ? '400ms' : '0ms' }}
        >
          {t('unsure')}
        </p>
      </div>
    </section>
  )
}
