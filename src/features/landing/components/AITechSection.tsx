'use client'

import { useTranslations } from 'next-intl'
import { Check, X } from 'lucide-react'
import { useScrollAnimation } from '../hooks/useScrollAnimation'

export function AITechSection() {
  const t = useTranslations('landing.aiTech')
  const { ref, isVisible } = useScrollAnimation()

  const aiModels = [
    { name: t('ai1Name'), role: t('ai1Role') },
    { name: t('ai2Name'), role: t('ai2Role') },
    { name: t('ai3Name'), role: t('ai3Role') },
  ]

  const columns = [
    {
      title: t('col1Title'),
      items: [t('col1Item1'), t('col1Item2'), t('col1Item3'), t('col1Item4')],
      highlighted: false,
    },
    {
      title: t('col2Title'),
      items: [t('col2Item1'), t('col2Item2'), t('col2Item3'), t('col2Item4')],
      highlighted: false,
    },
    {
      title: t('col3Title'),
      items: [t('col3Item1'), t('col3Item2'), t('col3Item3'), t('col3Item4')],
      highlighted: true,
    },
  ]

  return (
    <section className="py-20 md:py-24 bg-slate-900 text-white">
      <div ref={ref} className="container mx-auto px-4">
        <div
          className={`text-center mb-12 md:mb-16 transition-all duration-700 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">{t('title')}</h2>
          <p className="text-lg text-slate-300">{t('subtitle')}</p>
        </div>

        {/* Orchestrator diagram */}
        <div
          className={`max-w-2xl mx-auto mb-16 transition-all duration-700 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
          style={{ transitionDelay: isVisible ? '200ms' : '0ms' }}
        >
          <div className="text-center mb-4">
            <span className="text-sm text-slate-400">{t('input')}</span>
            <div className="mx-auto my-2 h-6 w-px bg-slate-600" />
          </div>
          <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6 md:p-8">
            <div className="text-center mb-6">
              <span className="text-sm font-semibold text-primary">{t('orchestrator')}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              {aiModels.map((m) => (
                <div
                  key={m.name}
                  className="rounded-lg border border-slate-600 bg-slate-800 p-3 md:p-4 text-center"
                >
                  <div className="text-sm font-bold mb-1">{m.name}</div>
                  <div className="text-xs text-slate-400">{m.role}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="text-center mt-4">
            <div className="mx-auto my-2 h-6 w-px bg-slate-600" />
            <span className="text-sm text-slate-400">{t('output')}</span>
          </div>
        </div>

        {/* Comparison table */}
        <div className="grid md:grid-cols-3 gap-4 md:gap-6">
          {columns.map((col, ci) => (
            <div
              key={col.title}
              className={`rounded-xl p-6 transition-all duration-700 ${
                col.highlighted
                  ? 'border-2 border-primary bg-slate-800 ring-1 ring-primary/20'
                  : 'border border-slate-700 bg-slate-800/50'
              } ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
              style={{ transitionDelay: isVisible ? `${400 + ci * 150}ms` : '0ms' }}
            >
              <h3 className={`text-lg font-bold mb-4 ${col.highlighted ? 'text-primary' : 'text-slate-300'}`}>
                {col.highlighted && '⭐ '}{col.title}
              </h3>
              <ul className="space-y-3">
                {col.items.map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm">
                    {col.highlighted ? (
                      <Check className="h-4 w-4 text-green-400 shrink-0" />
                    ) : (
                      <X className="h-4 w-4 text-slate-500 shrink-0" />
                    )}
                    <span className={col.highlighted ? 'text-white' : 'text-slate-400'}>
                      {item}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
