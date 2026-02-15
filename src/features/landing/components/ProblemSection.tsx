'use client'

import { useTranslations } from 'next-intl'
import { Lightbulb, Search, Clock, ArrowRight } from 'lucide-react'
import { useScrollAnimation } from '../hooks/useScrollAnimation'

const icons = {
  idea: Lightbulb,
  search: Search,
  clock: Clock,
}

export function ProblemSection() {
  const t = useTranslations('landing.problem')
  const { ref, isVisible } = useScrollAnimation()

  const cards = [
    { icon: 'idea' as const, title: t('card1Title'), desc: t('card1Desc') },
    { icon: 'search' as const, title: t('card2Title'), desc: t('card2Desc') },
    { icon: 'clock' as const, title: t('card3Title'), desc: t('card3Desc') },
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

        <div className="grid md:grid-cols-3 gap-6 md:gap-8 mb-12">
          {cards.map((card, i) => {
            const Icon = icons[card.icon]
            return (
              <div
                key={card.icon}
                className={`rounded-xl border bg-card p-6 md:p-8 shadow-sm transition-all duration-700 hover:shadow-md hover:-translate-y-1 ${
                  isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                }`}
                style={{ transitionDelay: isVisible ? `${i * 150}ms` : '0ms' }}
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-destructive/10">
                  <Icon className="h-6 w-6 text-destructive" />
                </div>
                <h3 className="mb-3 text-lg font-semibold leading-snug">{card.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{card.desc}</p>
              </div>
            )
          })}
        </div>

        {/* Highlight box */}
        <div
          className={`rounded-xl bg-primary/5 border-l-4 border-l-primary p-6 md:p-8 transition-all duration-700 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
          style={{ transitionDelay: isVisible ? '450ms' : '0ms' }}
        >
          <div className="space-y-1 text-sm md:text-base text-muted-foreground">
            <p>{t('highlightLine1')}</p>
            <p>{t('highlightLine2')}</p>
            <p>{t('highlightLine3')}</p>
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
