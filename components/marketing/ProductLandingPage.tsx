'use client'

import { MarketingNav } from './MarketingNav'
import { HeroSection } from './HeroSection'
import { SocialProofBar } from './SocialProofBar'
import { FeatureShowcase } from './FeatureShowcase'
import { PastorStorySection } from './PastorStorySection'
import { ComparisonSection } from './ComparisonSection'
import { TestimonialsSection } from './TestimonialsSection'
import { PricingSection } from './PricingSection'
import { MarketingFooter } from './MarketingFooter'

export function ProductLandingPage() {
  return (
    <main className="scroll-smooth">
      <MarketingNav />
      <HeroSection />
      <SocialProofBar />
      <FeatureShowcase />
      <PastorStorySection />
      <ComparisonSection />
      <TestimonialsSection />
      <PricingSection />
      <MarketingFooter />
    </main>
  )
}
