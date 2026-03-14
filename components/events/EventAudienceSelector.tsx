'use client'

import { useState, useEffect } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import { Loader2, Globe, Target } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface AudienceConfig {
  visibility: 'all' | 'restricted'
  hide_from_non_invited: boolean
  ministry_ids: string[]
  group_ids: string[]
}

interface Props {
  value: AudienceConfig
  onChange: (config: AudienceConfig) => void
}

interface MinistryOption {
  id: string
  name: string
  name_ar: string | null
}

export function EventAudienceSelector({ value, onChange }: Props) {
  const t = useTranslations('eventVisibility')
  const locale = useLocale()
  const isRTL = locale.startsWith('ar')
  const [ministries, setMinistries] = useState<MinistryOption[]>([])
  const [groups, setGroups] = useState<MinistryOption[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (value.visibility !== 'restricted' || ministries.length > 0) return
    const controller = new AbortController()
    setLoading(true)
    Promise.all([
      fetch('/api/ministries', { signal: controller.signal }).then(r => r.json()),
      fetch('/api/groups', { signal: controller.signal }).then(r => r.json()),
    ])
      .then(([mData, gData]) => {
        if (!controller.signal.aborted) {
          setMinistries(mData.data || [])
          setGroups(gData.data || [])
        }
      })
      .catch((e) => {
        if (e instanceof Error && e.name !== 'AbortError') {
          console.error('[EventAudienceSelector] Failed to fetch:', e)
        }
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [value.visibility, ministries.length])

  return (
    <div className="space-y-4">
      <Label className="text-sm text-zinc-500 mb-2 block">{t('audienceLabel')}</Label>

      {/* Step 1: All vs Restricted */}
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => onChange({ ...value, visibility: 'all', ministry_ids: [], group_ids: [] })}
          className={cn(
            'flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all',
            value.visibility === 'all'
              ? 'border-primary bg-primary/5'
              : 'border-zinc-100 hover:border-zinc-200'
          )}
        >
          <Globe className="h-5 w-5" />
          <span className="text-sm font-medium">{t('allMembers')}</span>
          <span className="text-xs text-muted-foreground">{t('allMembersDesc')}</span>
        </button>
        <button
          type="button"
          onClick={() => onChange({ ...value, visibility: 'restricted' })}
          className={cn(
            'flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all',
            value.visibility === 'restricted'
              ? 'border-primary bg-primary/5'
              : 'border-zinc-100 hover:border-zinc-200'
          )}
        >
          <Target className="h-5 w-5" />
          <span className="text-sm font-medium">{t('specific')}</span>
          <span className="text-xs text-muted-foreground">{t('specificDesc')}</span>
        </button>
      </div>

      {/* Step 2: Select ministries/groups */}
      {value.visibility === 'restricted' && (
        <div className="space-y-4 pt-2">
          {loading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {/* Ministries */}
              {ministries.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-zinc-500 mb-2">{t('ministries')}</p>
                  <div className="space-y-2">
                    {ministries.map(m => {
                      const name = isRTL ? (m.name_ar || m.name) : m.name
                      const checked = value.ministry_ids.includes(m.id)
                      return (
                        <label key={m.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-zinc-50 cursor-pointer">
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(c) => {
                              const ids = c
                                ? [...value.ministry_ids, m.id]
                                : value.ministry_ids.filter(id => id !== m.id)
                              onChange({ ...value, ministry_ids: ids })
                            }}
                          />
                          <span className="text-sm">{name}</span>
                        </label>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Groups */}
              {groups.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-zinc-500 mb-2">{t('groups')}</p>
                  <div className="space-y-2">
                    {groups.map(g => {
                      const name = isRTL ? (g.name_ar || g.name) : g.name
                      const checked = value.group_ids.includes(g.id)
                      return (
                        <label key={g.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-zinc-50 cursor-pointer">
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(c) => {
                              const ids = c
                                ? [...value.group_ids, g.id]
                                : value.group_ids.filter(id => id !== g.id)
                              onChange({ ...value, group_ids: ids })
                            }}
                          />
                          <span className="text-sm">{name}</span>
                        </label>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Step 3: Hide toggle */}
              <div className="flex items-center gap-3 p-3 rounded-lg bg-zinc-50 border">
                <Switch
                  checked={value.hide_from_non_invited}
                  onCheckedChange={(c) => onChange({ ...value, hide_from_non_invited: c })}
                />
                <div>
                  <Label className="text-sm">{t('hideToggle')}</Label>
                  <p className="text-xs text-muted-foreground">{t('hideToggleDesc')}</p>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
