import { redirect } from 'next/navigation'
import { getLocale } from 'next-intl/server'
import { getCurrentUserWithRole } from '@/lib/auth'
import { AppShell } from '@/components/layout/AppShell'
import { AnalyticsIdentifier } from '@/components/shared/AnalyticsIdentifier'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [authUser, locale] = await Promise.all([
    getCurrentUserWithRole(),
    getLocale(),
  ])

  // If onboarding not complete, send to onboarding
  if (!authUser.profile.onboarding_completed) {
    redirect('/onboarding')
  }

  return (
    <AppShell
      profile={authUser.profile}
      church={authUser.church}
      resolvedPermissions={authUser.resolvedPermissions}
    >
      <AnalyticsIdentifier
        userId={authUser.id}
        churchId={authUser.profile.church_id}
        role={authUser.profile.role}
        locale={locale}
      />
      {children}
    </AppShell>
  )
}
