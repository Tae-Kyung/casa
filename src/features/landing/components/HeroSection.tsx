'use client'

import { Link } from '@/i18n/navigation'
import { useTranslations } from 'next-intl'
import { ArrowRight, Zap, BarChart3, Rocket, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export function HeroSection() {
  const t = useTranslations('landing')

  const trustItems = [
    { icon: Zap, text: t('hero.trust1') },
    { icon: BarChart3, text: t('hero.trust2') },
    { icon: Rocket, text: t('hero.trust3') },
  ]

  const bottomItems = [t('hero.bottom1'), t('hero.bottom2'), t('hero.bottom3')]

  return (
    <section className="relative min-h-[100dvh] flex items-center pt-16">
      {/* Background pattern */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_1px_1px,_theme(colors.primary/0.05)_1px,_transparent_0)] [background-size:24px_24px]" />

      <div className="container mx-auto px-4 py-16 md:py-20">
        <div className="grid lg:grid-cols-5 gap-12 items-center">
          {/* Left: Text content */}
          <div className="lg:col-span-3 space-y-8">
            <Badge variant="secondary" className="px-4 py-1.5 text-sm font-medium">
              {t('hero.badge')}
            </Badge>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-tight">
              {t('hero.titleLine1')}
              <br />
              <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                {t('hero.titleLine2')}
              </span>
            </h1>

            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl leading-relaxed">
              {t('hero.subtitle')}
            </p>

            {/* Trust badges */}
            <div className="flex flex-wrap gap-3">
              {trustItems.map((item) => (
                <div
                  key={item.text}
                  className="flex items-center gap-2 rounded-full bg-muted/60 px-4 py-2 text-sm"
                >
                  <item.icon className="h-4 w-4 text-primary" />
                  <span className="font-medium">{item.text}</span>
                </div>
              ))}
            </div>

            {/* CTA buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Button size="lg" className="h-12 px-8 text-base" asChild>
                <Link href="/signup">
                  {t('hero.cta')}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="h-12 px-8 text-base" asChild>
                <a href="#features">{t('hero.ctaSecondary')}</a>
              </Button>
            </div>

            {/* Bottom trust text */}
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
              {bottomItems.map((item) => (
                <span key={item} className="flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5 text-green-500" />
                  {item}
                </span>
              ))}
            </div>
          </div>

          {/* Right: Dashboard mockup */}
          <div className="lg:col-span-2 hidden lg:block">
            <div className="relative">
              <div className="rounded-2xl border bg-card p-6 shadow-2xl">
                <div className="space-y-4">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="h-3 w-3 rounded-full bg-red-400" />
                    <div className="h-3 w-3 rounded-full bg-yellow-400" />
                    <div className="h-3 w-3 rounded-full bg-green-400" />
                    <span className="ml-2 text-xs text-muted-foreground">CASA Dashboard</span>
                  </div>
                  {/* Idea card mockup */}
                  <div className="rounded-lg bg-muted/50 p-4 space-y-2">
                    <div className="text-xs font-medium text-primary">IDEA CARD</div>
                    <div className="h-2 w-3/4 bg-muted rounded" />
                    <div className="h-2 w-1/2 bg-muted rounded" />
                  </div>
                  {/* Evaluation mockup */}
                  <div className="rounded-lg bg-muted/50 p-4 space-y-2">
                    <div className="text-xs font-medium text-primary">AI EVALUATION</div>
                    <div className="flex gap-2">
                      <div className="h-8 flex-1 bg-primary/20 rounded flex items-center justify-center text-xs font-bold text-primary">85</div>
                      <div className="h-8 flex-1 bg-primary/15 rounded flex items-center justify-center text-xs font-bold text-primary">78</div>
                      <div className="h-8 flex-1 bg-primary/10 rounded flex items-center justify-center text-xs font-bold text-primary">92</div>
                    </div>
                  </div>
                  {/* Document mockup */}
                  <div className="rounded-lg bg-muted/50 p-4 space-y-2">
                    <div className="text-xs font-medium text-primary">DOCUMENTS</div>
                    <div className="flex gap-2">
                      <Badge variant="secondary" className="text-xs">BP</Badge>
                      <Badge variant="secondary" className="text-xs">Pitch</Badge>
                      <Badge variant="outline" className="text-xs">Landing</Badge>
                    </div>
                  </div>
                </div>
              </div>
              {/* Floating elements */}
              <div className="absolute -top-4 -right-4 rounded-lg bg-card border shadow-lg p-3 animate-bounce [animation-duration:3s]">
                <div className="text-xs font-medium text-green-600">+85 Score</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
