import { redirect } from 'next/navigation'
import { setRequestLocale } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { LandingNav } from '@/features/landing/components/LandingNav'
import { HeroSection } from '@/features/landing/components/HeroSection'
import { ProblemSection } from '@/features/landing/components/ProblemSection'
import { SolutionOverview } from '@/features/landing/components/SolutionOverview'
import { FeatureSection } from '@/features/landing/components/FeatureSection'
import { AITechSection } from '@/features/landing/components/AITechSection'
import { StatsSection } from '@/features/landing/components/StatsSection'
import { CaseStudySection } from '@/features/landing/components/CaseStudySection'
import { TestimonialSection } from '@/features/landing/components/TestimonialSection'
import { ProcessSection } from '@/features/landing/components/ProcessSection'
import { PartnerSection } from '@/features/landing/components/PartnerSection'
import { FAQSection } from '@/features/landing/components/FAQSection'
import { FinalCTASection } from '@/features/landing/components/FinalCTASection'
import { LandingFooter } from '@/features/landing/components/LandingFooter'

interface Props {
  params: Promise<{ locale: string }>
}

export default async function LandingPage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)

  // 로그인된 사용자는 대시보드로 리다이렉트
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    redirect(`/${locale}/dashboard`)
  }

  return (
    <div className="min-h-screen">
      <LandingNav />
      <HeroSection />
      <ProblemSection />
      <SolutionOverview />
      <FeatureSection />
      <AITechSection />
      <StatsSection />
      <CaseStudySection />
      <TestimonialSection />
      <ProcessSection />
      <PartnerSection />
      <FAQSection />
      <FinalCTASection />
      <LandingFooter />
    </div>
  )
}
