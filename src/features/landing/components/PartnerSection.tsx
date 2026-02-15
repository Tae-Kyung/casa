'use client'

import { useTranslations } from 'next-intl'
import { Badge } from '@/components/ui/badge'
import { useScrollAnimation } from '../hooks/useScrollAnimation'

export function PartnerSection() {
  const t = useTranslations('landing.partner')
  const { ref, isVisible } = useScrollAnimation()

  const orgs = [t('org1'), t('org2'), t('org3')]
  const techs = [t('tech1'), t('tech2'), t('tech3')]

  return (
    <section className="py-20 md:py-24 bg-muted/20">
      <div ref={ref} className="container mx-auto px-4">
        <h2
          className={`text-3xl md:text-4xl font-bold text-center mb-12 md:mb-16 transition-all duration-700 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          {t('title')}
        </h2>

        <div
          className={`max-w-4xl mx-auto grid md:grid-cols-2 gap-8 md:gap-12 transition-all duration-700 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
          style={{ transitionDelay: isVisible ? '200ms' : '0ms' }}
        >
          {/* Supporting orgs */}
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-6">
              {t('orgLabel')}
            </h3>
            <div className="space-y-4">
              {orgs.map((org, i) => (
                <div
                  key={org}
                  className="flex items-center gap-3 rounded-lg border bg-card p-4"
                >
                  <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground shrink-0">
                    {['CBNU', 'LINC', 'BIC'][i]}
                  </div>
                  <div>
                    <div className="text-sm font-medium">{org}</div>
                    {i === 0 && (
                      <Badge variant="secondary" className="text-xs mt-1">
                        {t('official')}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tech partners */}
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-6">
              {t('techLabel')}
            </h3>
            <div className="space-y-4">
              {techs.map((tech, i) => (
                <div
                  key={tech}
                  className="flex items-center gap-3 rounded-lg border bg-card p-4"
                >
                  <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground shrink-0 grayscale">
                    {['AI', 'DB', 'V'][i]}
                  </div>
                  <div className="text-sm font-medium">{tech}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
