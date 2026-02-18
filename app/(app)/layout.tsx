import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getCurrentUserWithRole } from '@/lib/auth'
import { AppShell } from '@/components/layout/AppShell'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const authUser = await getCurrentUserWithRole()

  // If onboarding not complete, send to onboarding
  if (!authUser.profile.onboarding_completed) {
    redirect('/onboarding')
  }

  const cookieStore = await cookies()
  const lang = cookieStore.get('lang')?.value ?? 'ar'

  return (
    <AppShell
      profile={authUser.profile}
      church={authUser.church}
      initialLang={lang}
    >
      {children}
    </AppShell>
  )
}
