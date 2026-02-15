'use client'

import { useState } from 'react'
import { Link } from '@/i18n/navigation'
import { useTranslations } from 'next-intl'
import { ArrowRight, ChevronLeft, ChevronRight, Quote, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useScrollAnimation } from '../hooks/useScrollAnimation'

export function TestimonialSection() {
  const t = useTranslations('landing.testimonial')
  const { ref, isVisible } = useScrollAnimation()
  const [current, setCurrent] = useState(0)

  const testimonials = [
    { quote: t('t1Quote'), name: t('t1Name'), role: t('t1Role'), initial: t('t1Name').charAt(0) },
    { quote: t('t2Quote'), name: t('t2Name'), role: t('t2Role'), initial: t('t2Name').charAt(0) },
    { quote: t('t3Quote'), name: t('t3Name'), role: t('t3Role'), initial: t('t3Name').charAt(0) },
  ]

  const prev = () => setCurrent((c) => (c - 1 + testimonials.length) % testimonials.length)
  const next = () => setCurrent((c) => (c + 1) % testimonials.length)

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

        <div
          className={`max-w-3xl mx-auto transition-all duration-700 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
          style={{ transitionDelay: isVisible ? '200ms' : '0ms' }}
        >
          {/* Carousel */}
          <div className="relative overflow-hidden">
            <div
              className="flex transition-transform duration-500 ease-out"
              style={{ transform: `translateX(-${current * 100}%)` }}
            >
              {testimonials.map((item, i) => (
                <div key={i} className="w-full flex-none px-4">
                  <div className="rounded-2xl border bg-card p-8 md:p-10">
                    <Quote className="h-8 w-8 text-primary/20 mb-4" />
                    <div className="flex gap-1 mb-4">
                      {[...Array(5)].map((_, si) => (
                        <Star key={si} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      ))}
                    </div>
                    <blockquote className="text-base md:text-lg leading-relaxed mb-6">
                      &ldquo;{item.quote}&rdquo;
                    </blockquote>
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                        {item.initial}
                      </div>
                      <div>
                        <div className="font-semibold text-sm">{item.name}</div>
                        <div className="text-xs text-muted-foreground">{item.role}</div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-center gap-4 mt-6">
            <button
              onClick={prev}
              className="h-8 w-8 rounded-full border flex items-center justify-center hover:bg-muted transition-colors"
              aria-label="Previous testimonial"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="flex gap-2">
              {testimonials.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrent(i)}
                  className={`h-2 rounded-full transition-all ${
                    i === current ? 'w-6 bg-primary' : 'w-2 bg-muted-foreground/30'
                  }`}
                  aria-label={`Go to testimonial ${i + 1}`}
                />
              ))}
            </div>
            <button
              onClick={next}
              className="h-8 w-8 rounded-full border flex items-center justify-center hover:bg-muted transition-colors"
              aria-label="Next testimonial"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* CTA */}
          <div className="text-center mt-8">
            <Button size="lg" asChild>
              <Link href="/signup">
                {t('cta')}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
