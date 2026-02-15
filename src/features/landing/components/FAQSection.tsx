'use client'

import { useTranslations } from 'next-intl'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { useScrollAnimation } from '../hooks/useScrollAnimation'

export function FAQSection() {
  const t = useTranslations('landing.faq')
  const { ref, isVisible } = useScrollAnimation()

  const faqs = Array.from({ length: 10 }, (_, i) => ({
    q: t(`q${i + 1}` as 'q1'),
    a: t(`a${i + 1}` as 'a1'),
  }))

  const leftFaqs = faqs.slice(0, 5)
  const rightFaqs = faqs.slice(5)

  return (
    <section id="faq" className="py-20 md:py-24">
      <div ref={ref} className="container mx-auto px-4">
        <h2
          className={`text-3xl md:text-4xl font-bold text-center mb-12 md:mb-16 transition-all duration-700 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          {t('title')}
        </h2>

        <div
          className={`max-w-5xl mx-auto grid md:grid-cols-2 gap-6 md:gap-8 transition-all duration-700 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
          style={{ transitionDelay: isVisible ? '200ms' : '0ms' }}
        >
          <Accordion type="single" collapsible className="space-y-2">
            {leftFaqs.map((faq, i) => (
              <AccordionItem key={i} value={`left-${i}`} className="border rounded-lg px-4">
                <AccordionTrigger className="text-sm font-semibold text-left hover:no-underline">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>

          <Accordion type="single" collapsible className="space-y-2">
            {rightFaqs.map((faq, i) => (
              <AccordionItem key={i} value={`right-${i}`} className="border rounded-lg px-4">
                <AccordionTrigger className="text-sm font-semibold text-left hover:no-underline">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  )
}
