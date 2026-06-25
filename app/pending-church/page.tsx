import { redirect } from 'next/navigation'
import { getLocale, getTranslations } from 'next-intl/server'
import { Clock } from 'lucide-react'
import { getCurrentUserSafe, signOut } from '@/lib/auth'
import { Button } from '@/components/ui/button'

// Holding screen for a church awaiting platform review (status !== 'active').
// Lives OUTSIDE the (app) group so it doesn't render the app shell / bottom nav.
// The (app) layout redirects pending users here; an active church never lands here.
export default async function PendingChurchPage() {
  const [authUser, locale, t] = await Promise.all([
    getCurrentUserSafe(),
    getLocale(),
    getTranslations('pendingChurch'),
  ])

  if (!authUser) {
    redirect('/login')
  }

  // If the church is already active, the user belongs in the app.
  if (!authUser.church.status || authUser.church.status === 'active') {
    redirect('/dashboard')
  }

  const isAr = locale.startsWith('ar')
  const churchName =
    (isAr ? authUser.church.name_ar || authUser.church.name : authUser.church.name || authUser.church.name_ar) || ''

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-zinc-50 to-zinc-100 p-4">
      <div className="w-full max-w-md text-center">
        <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
          <Clock className="h-8 w-8 text-primary" />
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">{t('title')}</h1>
        <p className="text-sm text-zinc-600 mt-3 leading-relaxed">{t('body')}</p>

        {churchName && (
          <div className="mt-6 rounded-xl border border-zinc-200 bg-white px-4 py-3">
            <p className="text-xs text-zinc-500">{t('churchLabel')}</p>
            <p className="font-semibold text-zinc-900 mt-0.5">{churchName}</p>
          </div>
        )}

        <p className="text-xs text-zinc-500 mt-6">{t('contactNote')}</p>

        <form action={signOut} className="mt-8">
          <Button type="submit" variant="outline" className="h-11 w-full">
            {t('signOut')}
          </Button>
        </form>
      </div>
    </div>
  )
}

export const dynamic = 'force-dynamic'
