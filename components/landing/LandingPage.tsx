import { getTranslations, getLocale } from 'next-intl/server'
import type { Church, ChurchLeader } from '@/types'
import { LandingNav } from './LandingNav'
import { HeroSection } from './HeroSection'
import { AboutSection } from './AboutSection'
import { LeadershipSection } from './LeadershipSection'
import { CTASection } from './CTASection'

interface LandingPageProps {
  church: Church
  leaders: ChurchLeader[]
}

export async function LandingPage({ church, leaders }: LandingPageProps) {
  const locale = await getLocale()
  const isRTL = locale === 'ar'

  const churchName = isRTL ? (church.name_ar ?? church.name) : church.name
  const welcomeMessage = isRTL
    ? (church.welcome_message_ar ?? church.welcome_message)
    : (church.welcome_message ?? church.welcome_message_ar)

  return (
    <main className="scroll-smooth">
      <LandingNav churchName={churchName} logoUrl={church.logo_url} />
      <HeroSection
        churchName={churchName}
        logoUrl={church.logo_url}
        primaryColor={church.primary_color}
        churchId={church.id}
      />
      {welcomeMessage && <AboutSection message={welcomeMessage} />}
      {leaders.length > 0 && <LeadershipSection leaders={leaders} />}
      <CTASection churchId={church.id} />
    </main>
  )
}
