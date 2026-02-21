'use client'

import { useTranslations, useLocale } from 'next-intl'
import { Badge } from '@/components/ui/badge'

interface ServingSignupListProps {
  signups: any[]
}

export function ServingSignupList({ signups }: ServingSignupListProps) {
  const t = useTranslations('serving')
  const locale = useLocale()
  const isAr = locale === 'ar'

  const active = signups.filter(s => s.status !== 'cancelled')

  if (active.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {t('noSignups')}
      </div>
    )
  }

  const statusColors: Record<string, string> = {
    signed_up: 'bg-blue-100 text-blue-800',
    confirmed: 'bg-green-100 text-green-800',
    cancelled: 'bg-zinc-100 text-zinc-600',
  }

  return (
    <div className="divide-y rounded-lg border">
      {active.map((signup: any) => {
        const profile = signup.profiles
        const name = profile
          ? (isAr
            ? `${profile.first_name_ar || profile.first_name || ''} ${profile.last_name_ar || profile.last_name || ''}`
            : `${profile.first_name || ''} ${profile.last_name || ''}`)
          : t('unknownMember')

        return (
          <div key={signup.id} className="flex items-center justify-between p-3">
            <div>
              <p className="font-medium text-sm">{name.trim()}</p>
              {profile?.phone && (
                <p className="text-xs text-muted-foreground">{profile.phone}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Badge className={statusColors[signup.status] || ''} variant="secondary">
                {t(signup.status)}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {new Date(signup.signed_up_at).toLocaleDateString(isAr ? 'ar-EG' : 'en-US')}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
