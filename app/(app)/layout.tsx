import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { getLocale } from 'next-intl/server'
import { getCurrentUserWithRole } from '@/lib/auth'
import { isPlatformAdmin } from '@/lib/platform'
import { PENDING_CHURCH_ALLOWED_HREFS } from '@/lib/navigation'
import { AppShell } from '@/components/layout/AppShell'
import { AnalyticsIdentifier } from '@/components/shared/AnalyticsIdentifier'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [authUser, locale, hdrs] = await Promise.all([
    getCurrentUserWithRole(),
    getLocale(),
    headers(),
  ])

  // If onboarding not complete, send to onboarding
  if (!authUser.profile.onboarding_completed) {
    redirect('/onboarding')
  }

  // A4: a church awaiting platform review (or rejected/inactive) gets a RESTRICTED app —
  // its founder can edit church info, watch the tutorial lessons, and see their profile,
  // but nothing operational until approved. (Migration 079 default 'active' → this is a
  // no-op for existing/live churches.) The nav is trimmed to match; this server check is
  // the enforcement (belt-and-suspenders): any non-allowlisted path bounces to /dashboard,
  // which renders the "under review" state.
  const isPending = !!(authUser.church.status && authUser.church.status !== 'active')
  if (isPending) {
    // Degrade safely: only redirect when we positively know the path is NOT allowlisted.
    // If x-pathname is absent, don't block (the trimmed nav + the requireActiveChurch API
    // guard remain the real boundaries — this is UX defense-in-depth, not the security gate).
    const pathname = hdrs.get('x-pathname') ?? ''
    const allowed =
      !pathname ||
      PENDING_CHURCH_ALLOWED_HREFS.some((href) => pathname === href || pathname.startsWith(href + '/'))
    if (!allowed) {
      redirect('/dashboard')
    }
  }

  const platformAdmin = await isPlatformAdmin(authUser.email)

  return (
    <div className="app-shell-active">
      <AppShell
        profile={authUser.profile}
        church={authUser.church}
        resolvedPermissions={authUser.resolvedPermissions}
        isPendingChurch={isPending}
        isPlatformAdmin={platformAdmin}
      >
        <AnalyticsIdentifier
          userId={authUser.id}
          churchId={authUser.profile.church_id}
          role={authUser.profile.role}
          locale={locale}
        />
        {children}
      </AppShell>
    </div>
  )
}
