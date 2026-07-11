import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getLocale, getTranslations } from 'next-intl/server'
import { Clock } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { signOut } from '@/lib/auth'
import { Button } from '@/components/ui/button'

// Holding screen for a member whose membership to their active church is not yet 'active'
// — the self-signup approval gate (migration 088). Lives OUTSIDE the (app) group so it
// renders no app shell, and uses raw queries (NOT getCurrentUserWithRole, which would
// redirect a pending member straight back here and loop).
export default async function MembershipPendingPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('church_id, church:church_id(name, name_ar)')
    .eq('id', user.id)
    .single()
  if (!profile) redirect('/login')

  // Membership for the active church.
  const { data: membership } = await supabase
    .from('user_churches')
    .select('status')
    .eq('user_id', user.id)
    .eq('church_id', profile.church_id)
    .single()

  // Active (approved) → belongs in the app.
  if (!membership || membership.status === 'active') redirect('/dashboard')

  // Any OTHER active membership? Then offer a switch instead of a dead end.
  const { data: others } = await supabase
    .from('user_churches')
    .select('church_id')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .limit(1)
  const hasOtherActive = (others?.length ?? 0) > 0

  const [locale, t] = await Promise.all([
    getLocale(),
    getTranslations('membershipPending'),
  ])

  const isAr = locale.startsWith('ar')
  // Supabase types the to-one embed as an array — normalize to a single object.
  const churchRel = profile.church as unknown
  const church = (Array.isArray(churchRel) ? churchRel[0] : churchRel) as { name: string | null; name_ar: string | null } | null
  const churchName = (isAr ? church?.name_ar || church?.name : church?.name || church?.name_ar) || ''

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

        <div className="mt-8 space-y-2">
          {hasOtherActive && (
            <Button asChild variant="default" className="h-11 w-full">
              <Link href="/select-church">{t('switchChurch')}</Link>
            </Button>
          )}
          <form action={signOut}>
            <Button type="submit" variant="outline" className="h-11 w-full">
              {t('signOut')}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}

export const dynamic = 'force-dynamic'
