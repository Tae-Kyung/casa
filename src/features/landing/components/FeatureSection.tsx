'use client'

import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { Lightbulb, BarChart3, FileText, Rocket, Check } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { useScrollAnimation } from '../hooks/useScrollAnimation'

const featureIcons = [Lightbulb, BarChart3, FileText, Rocket]
const featureImages = [
  '/images/landing/feature-idea.png',
  '/images/landing/feature-eval.png',
  '/images/landing/feature-docs.png',
  '/images/landing/feature-deploy.png',
]

function FeatureBlock({ index }: { index: number }) {
  const t = useTranslations('landing.features')
  const { ref, isVisible } = useScrollAnimation()
  const n = index + 1
  const Icon = featureIcons[index]
  const isEven = index % 2 === 0

  const tags = [
    t(`f${n}Tag1` as 'f1Tag1'),
    t(`f${n}Tag2` as 'f1Tag2'),
    t(`f${n}Tag3` as 'f1Tag3'),
  ]
  const points = [
    t(`f${n}Point1` as 'f1Point1'),
    t(`f${n}Point2` as 'f1Point2'),
    t(`f${n}Point3` as 'f1Point3'),
    t(`f${n}Point4` as 'f1Point4'),
  ]

  return (
    <div
      ref={ref}
      className={`grid lg:grid-cols-2 gap-8 lg:gap-12 items-center ${
        index > 0 ? 'mt-16 md:mt-20' : ''
      }`}
    >
      {/* Text */}
      <div
        className={`space-y-4 transition-all duration-700 ${
          isVisible ? 'opacity-100 translate-x-0' : isEven ? 'opacity-0 -translate-x-10' : 'opacity-0 translate-x-10'
        } ${!isEven ? 'lg:order-2' : ''}`}
      >
        <div className="flex items-center gap-2">
          <Icon className="h-5 w-5 text-primary" />
          <span className="text-sm font-semibold text-primary">
            {t(`f${n}Label` as 'f1Label')}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs">
              #{tag}
            </Badge>
          ))}
        </div>
        <h3 className="text-2xl md:text-3xl font-bold">
          {t(`f${n}Title` as 'f1Title')}
        </h3>
        <p className="text-muted-foreground leading-relaxed">
          {t(`f${n}Desc` as 'f1Desc')}
        </p>
        <ul className="space-y-2">
          {points.map((point) => (
            <li key={point} className="flex items-start gap-2 text-sm">
              <Check className="h-4 w-4 mt-0.5 text-primary shrink-0" />
              <span>{point}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Feature illustration */}
      <div
        className={`transition-all duration-700 ${
          isVisible ? 'opacity-100 translate-x-0' : isEven ? 'opacity-0 translate-x-10' : 'opacity-0 -translate-x-10'
        } ${!isEven ? 'lg:order-1' : ''}`}
      >
        <div className="rounded-2xl border bg-muted/30 overflow-hidden">
          <Image
            src={featureImages[index]}
            alt={t(`f${n}Label` as 'f1Label')}
            width={600}
            height={400}
            className="w-full h-auto"
          />
        </div>
      </div>
    </div>
  )
}

export function FeatureSection() {
  const t = useTranslations('landing.features')

  return (
    <section id="features" className="py-20 md:py-24 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12 md:mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">{t('title')}</h2>
          <p className="text-lg text-muted-foreground">{t('subtitle')}</p>
        </div>
        {[0, 1, 2, 3].map((i) => (
          <FeatureBlock key={i} index={i} />
        ))}
      </div>
    </section>
  )
}
