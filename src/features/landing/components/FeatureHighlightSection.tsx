'use client'

import { useTranslations } from 'next-intl'
import {
  Bot,
  Paperclip,
  FileType,
  RotateCcw,
  Printer,
  Globe,
} from 'lucide-react'
import { useScrollAnimation } from '../hooks/useScrollAnimation'

const featureIcons = [Bot, Paperclip, FileType, RotateCcw, Printer, Globe]

export function FeatureHighlightSection() {
  const t = useTranslations('landing.features')
  const { ref, isVisible } = useScrollAnimation()

  const features = Array.from({ length: 6 }, (_, i) => ({
    icon: featureIcons[i],
    title: t(`f${i + 1}Title` as 'f1Title'),
    desc: t(`f${i + 1}Desc` as 'f1Desc'),
  }))

  return (
    <section id="features" className="py-20 md:py-24 bg-muted/20">
      <div ref={ref} className="container mx-auto px-4">
        <h2
          className={`text-3xl md:text-4xl font-bold text-center mb-12 md:mb-16 transition-all duration-700 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          {t('title')}
        </h2>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 max-w-5xl mx-auto">
          {features.map((feature, i) => {
            const Icon = feature.icon
            return (
              <div
                key={i}
                className={`rounded-xl border bg-card p-6 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 ${
                  isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                }`}
                style={{
                  transitionDelay: isVisible ? `${200 + i * 100}ms` : '0ms',
                  transitionDuration: '700ms',
                }}
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                  <Icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-base font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {feature.desc}
                </p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
