'use client'

import { useTranslations } from 'next-intl'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useScrollAnimation } from '../hooks/useScrollAnimation'

function CaseCard({
  caseKey,
  t,
}: {
  caseKey: 'case1' | 'case2' | 'case3'
  t: ReturnType<typeof useTranslations<'landing.caseStudy'>>
}) {
  const befores = [
    t(`${caseKey}Before1` as 'case1Before1'),
    t(`${caseKey}Before2` as 'case1Before2'),
    t(`${caseKey}Before3` as 'case1Before3'),
  ]
  const casas = [
    t(`${caseKey}Casa1` as 'case1Casa1'),
    t(`${caseKey}Casa2` as 'case1Casa2'),
    t(`${caseKey}Casa3` as 'case1Casa3'),
  ]
  const afters = [
    t(`${caseKey}After1` as 'case1After1'),
    t(`${caseKey}After2` as 'case1After2'),
    t(`${caseKey}After3` as 'case1After3'),
  ]

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <span className="text-sm font-medium text-muted-foreground">
          {t(`${caseKey}Name` as 'case1Name')}
        </span>
      </div>
      <div className="grid md:grid-cols-3 gap-4 md:gap-6">
        {/* Before */}
        <div className="rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 p-5">
          <h4 className="text-sm font-bold text-red-600 dark:text-red-400 mb-3">{t('beforeLabel')}</h4>
          <ul className="space-y-2">
            {befores.map((item, i) => (
              <li key={i} className="text-sm text-red-700 dark:text-red-300/80 flex items-start gap-2">
                <span className="text-red-400 shrink-0 mt-1">-</span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* CASA */}
        <div className="rounded-xl bg-primary/5 border border-primary/20 p-5">
          <h4 className="text-sm font-bold text-primary mb-3">{t('casaLabel')}</h4>
          <ul className="space-y-2">
            {casas.map((item, i) => (
              <li key={i} className="text-sm flex items-start gap-2">
                <span className="text-primary shrink-0 mt-1">→</span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* After */}
        <div className="rounded-xl bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900/30 p-5">
          <h4 className="text-sm font-bold text-green-600 dark:text-green-400 mb-3">{t('afterLabel')}</h4>
          <ul className="space-y-2">
            {afters.map((item, i) => (
              <li key={i} className="text-sm text-green-700 dark:text-green-300/80 flex items-start gap-2">
                <span className="text-green-400 shrink-0 mt-1">+</span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}

export function CaseStudySection() {
  const t = useTranslations('landing.caseStudy')
  const { ref, isVisible } = useScrollAnimation()

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

        <div
          className={`transition-all duration-700 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
          style={{ transitionDelay: isVisible ? '200ms' : '0ms' }}
        >
          <Tabs defaultValue="case1" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-8">
              <TabsTrigger value="case1">{t('case1Tab')}</TabsTrigger>
              <TabsTrigger value="case2">{t('case2Tab')}</TabsTrigger>
              <TabsTrigger value="case3">{t('case3Tab')}</TabsTrigger>
            </TabsList>
            <TabsContent value="case1">
              <CaseCard caseKey="case1" t={t} />
            </TabsContent>
            <TabsContent value="case2">
              <CaseCard caseKey="case2" t={t} />
            </TabsContent>
            <TabsContent value="case3">
              <CaseCard caseKey="case3" t={t} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </section>
  )
}
