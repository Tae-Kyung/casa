'use client'

import { useTranslations } from 'next-intl'
import {
  Lightbulb,
  Search,
  Clock,
  BarChart3,
  DollarSign,
  TrendingUp,
  ArrowRight,
} from 'lucide-react'
import { useScrollAnimation } from '../hooks/useScrollAnimation'

const preIcons = [Lightbulb, Search, Clock]
const startupIcons = [BarChart3, DollarSign, TrendingUp]

export function ProblemSection() {
  const t = useTranslations('landing.problem')
  const { ref, isVisible } = useScrollAnimation()

  const preCards = [
    { icon: preIcons[0], title: t('pre1Title'), desc: t('pre1Desc') },
    { icon: preIcons[1], title: t('pre2Title'), desc: t('pre2Desc') },
    { icon: preIcons[2], title: t('pre3Title'), desc: t('pre3Desc') },
  ]

  const startupCards = [
    { icon: startupIcons[0], title: t('startup1Title'), desc: t('startup1Desc') },
    { icon: startupIcons[1], title: t('startup2Title'), desc: t('startup2Desc') },
    { icon: startupIcons[2], title: t('startup3Title'), desc: t('startup3Desc') },
  ]

  return (
    <section className="py-20 md:py-24 bg-muted/30">
      <div ref={ref} className="container mx-auto px-4">
        <h2
          className={`text-3xl md:text-4xl font-bold text-center mb-12 md:mb-16 transition-all duration-700 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          {t('title')}
        </h2>

        <div className="grid lg:grid-cols-2 gap-6 md:gap-8 mb-12">
          {/* Pre-founder pain points */}
          <div
            className={`rounded-2xl border bg-card p-6 md:p-8 border-t-4 border-t-primary transition-all duration-700 ${
              isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-8'
            }`}
            style={{ transitionDelay: isVisible ? '150ms' : '0ms' }}
          >
            <h3 className="text-lg font-bold mb-6 text-primary">{t('preTitle')}</h3>
            <div className="space-y-5">
              {preCards.map((card, i) => {
                const Icon = card.icon
                return (
                  <div key={i} className="flex gap-4">
                    <div className="shrink-0 h-10 w-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                      <Icon className="h-5 w-5 text-destructive" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold mb-1">{card.title}</h4>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {card.desc}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Founder pain points */}
          <div
            className={`rounded-2xl border bg-card p-6 md:p-8 border-t-4 border-t-emerald-500 transition-all duration-700 ${
              isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'
            }`}
            style={{ transitionDelay: isVisible ? '150ms' : '0ms' }}
          >
            <h3 className="text-lg font-bold mb-6 text-emerald-600">{t('startupTitle')}</h3>
            <div className="space-y-5">
              {startupCards.map((card, i) => {
                const Icon = card.icon
                return (
                  <div key={i} className="flex gap-4">
                    <div className="shrink-0 h-10 w-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                      <Icon className="h-5 w-5 text-destructive" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold mb-1">{card.title}</h4>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {card.desc}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Highlight box */}
        <div
          className={`rounded-xl bg-primary/5 border-l-4 border-l-primary p-6 md:p-8 transition-all duration-700 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
          style={{ transitionDelay: isVisible ? '400ms' : '0ms' }}
        >
          <div className="space-y-1 text-sm md:text-base text-muted-foreground">
            <p>{t('highlightLine1')}</p>
            <p>{t('highlightLine2')}</p>
          </div>
          <p className="mt-4 flex items-center gap-2 text-base md:text-lg font-semibold text-primary">
            <ArrowRight className="h-5 w-5" />
            {t('highlightConclusion')}
          </p>
        </div>
      </div>
    </section>
  )
}
