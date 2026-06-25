'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Globe, ShieldCheck, EyeOff, Check } from 'lucide-react'
import type { MemberDirectoryVisibility } from '@/lib/members/visibility'

interface Props {
  initialVisibility: MemberDirectoryVisibility
}

const OPTIONS: { value: MemberDirectoryVisibility; icon: typeof Globe }[] = [
  { value: 'everyone', icon: Globe },
  { value: 'leaders_only', icon: ShieldCheck },
  { value: 'hidden', icon: EyeOff },
]

export function MemberDirectoryPrivacySettings({ initialVisibility }: Props) {
  const t = useTranslations('settings')
  const [visibility, setVisibility] = useState<MemberDirectoryVisibility>(initialVisibility)
  const [saving, setSaving] = useState(false)

  const handleSelect = async (next: MemberDirectoryVisibility) => {
    if (saving || next === visibility) return
    const previous = visibility
    setVisibility(next) // optimistic
    setSaving(true)
    try {
      const res = await fetch('/api/churches/privacy-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ member_directory_visibility: next }),
      })
      if (!res.ok) {
        setVisibility(previous) // revert
        toast.error(t('privacySaveFailed'))
        return
      }
      toast.success(t('privacySaved'))
    } catch {
      setVisibility(previous) // revert
      toast.error(t('privacySaveFailed'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <ShieldCheck className="w-4 h-4" />
          {t('privacyDirectoryTitle')}
        </CardTitle>
        <CardDescription>{t('privacyDirectorySubtitle')}</CardDescription>
      </CardHeader>
      <CardContent>
        <fieldset
          className="space-y-3"
          role="radiogroup"
          aria-label={t('privacyDirectoryTitle')}
        >
          {OPTIONS.map(({ value, icon: Icon }) => {
            const selected = visibility === value
            return (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={selected}
                disabled={saving}
                onClick={() => handleSelect(value)}
                className={`flex w-full items-start gap-3 rounded-lg border p-3 text-start transition-colors min-h-11 disabled:opacity-60 ${
                  selected ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                }`}
              >
                <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${selected ? 'text-primary' : 'text-muted-foreground'}`} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{t(`privacyOption_${value}_label`)}</p>
                  <p className="text-xs text-muted-foreground mt-1">{t(`privacyOption_${value}_help`)}</p>
                </div>
                {selected && <Check className="w-4 h-4 mt-0.5 shrink-0 text-primary" aria-hidden />}
              </button>
            )
          })}
        </fieldset>
      </CardContent>
    </Card>
  )
}
