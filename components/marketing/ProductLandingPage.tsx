'use client'

import { MarketingNav } from './MarketingNav'
import { HeroSection } from './HeroSection'
import { CapabilitiesSection } from './CapabilitiesSection'
import { PathsSection } from './PathsSection'
import { MissionSection } from './MissionSection'
import { MarketingFooter } from './MarketingFooter'

export function ProductLandingPage() {
  return (
    <main className="scroll-smooth">
      <MarketingNav />
      <HeroSection />
      <CapabilitiesSection />
      <PathsSection />
      <MissionSection />
      <MarketingFooter />
    </main>
  )
}
