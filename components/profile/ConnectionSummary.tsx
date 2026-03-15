'use client'

import { useState, useEffect, useCallback } from 'react'

import { useTranslations, useLocale } from 'next-intl'
import { toast } from 'sonner'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'

import { Users, Heart, Briefcase, Plus, Loader2 } from 'lucide-react'
import Link from 'next/link'

type ConnectionSummaryProps = {
  profileId: string
  churchId: string
  isAdmin: boolean
}

type GroupMembership = {
  id: string
  role_in_group: string
  joined_at: string
  is_active: boolean
  group_id: string
  group_name: string
  group_name_ar: string | null
  group_type: string
  ministry_name: string | null
  ministry_name_ar: string | null
}

type MinistryMembership = {
  id: string
  role_in_ministry: string
  joined_at: string
  is_active: boolean
  ministry_id: string
  ministry_name: string
  ministry_name_ar: string | null
}

type ServingSignup = {
  id: string
  status: string
  slot_title: string
  slot_title_ar: string | null
  slot_date: string
  area_name: string | null
  area_name_ar: string | null
}

type InvolvementData = {
  stats: {
    activeGroups: number
    activeMinistries: number
    totalServingSignups: number
  }
  groupMemberships: GroupMembership[]
  ministryMemberships: MinistryMembership[]
  servingSignups: ServingSignup[]
}

type PickerItem = {
  id: string
  name: string
  name_ar: string | null
}

export function ConnectionSummary({ profileId, churchId, isAdmin }: ConnectionSummaryProps) {
  const t = useTranslations('involvement')
  const locale = useLocale()
  const isRTL = locale.startsWith('ar')

  const [data, setData] = useState<InvolvementData | null>(null)
  const [loading, setLoading] = useState(true)

  // Dialog state
  const [addGroupOpen, setAddGroupOpen] = useState(false)
  const [addMinistryOpen, setAddMinistryOpen] = useState(false)
  const [groups, setGroups] = useState<PickerItem[]>([])
  const [ministries, setMinistries] = useState<PickerItem[]>([])
  const [loadingPicker, setLoadingPicker] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Fetch involvement data
  const fetchData = useCallback(async (signal?: AbortSignal) => {
    try {
      const res = await fetch(`/api/profiles/${profileId}/involvement`, { signal })
      if (!res.ok) throw new Error('Failed')
      const d = await res.json()
      if (!signal?.aborted) setData(d)
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return
      toast.error(t('errorLoad'))
    } finally {
      if (!signal?.aborted) setLoading(false)
    }
  }, [profileId, t])

  useEffect(() => {
    const controller = new AbortController()
    fetchData(controller.signal)
    return () => controller.abort()
  }, [fetchData])

  // Fetch picker options
  const openGroupPicker = async () => {
    setAddGroupOpen(true)
    setLoadingPicker(true)
    try {
      const res = await fetch(`/api/groups?church_id=${churchId}`)
      if (!res.ok) throw new Error('Failed')
      const d = await res.json()
      const items = (d.data || []).map((g: Record<string, unknown>) => ({
        id: g.id as string,
        name: g.name as string,
        name_ar: (g.name_ar as string | null) ?? null,
      }))
      setGroups(items)
    } catch {
      toast.error(t('errorLoad'))
    } finally {
      setLoadingPicker(false)
    }
  }

  const openMinistryPicker = async () => {
    setAddMinistryOpen(true)
    setLoadingPicker(true)
    try {
      const res = await fetch(`/api/ministries`)
      if (!res.ok) throw new Error('Failed')
      const d = await res.json()
      const items = (d.data || []).map((m: Record<string, unknown>) => ({
        id: m.id as string,
        name: m.name as string,
        name_ar: (m.name_ar as string | null) ?? null,
      }))
      setMinistries(items)
    } catch {
      toast.error(t('errorLoad'))
    } finally {
      setLoadingPicker(false)
    }
  }

  const addToGroup = async (groupId: string) => {
    if (isSubmitting) return
    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/groups/${groupId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile_id: profileId }),
      })
      if (!res.ok) throw new Error('Failed')
      toast.success(t('memberAdded'))
      setAddGroupOpen(false)
      // Refresh data
      setLoading(true)
      fetchData()
    } catch {
      toast.error(t('errorAdd'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const addToMinistry = async (ministryId: string) => {
    if (isSubmitting) return
    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/ministries/${ministryId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile_id: profileId }),
      })
      if (!res.ok) throw new Error('Failed')
      toast.success(t('memberAdded'))
      setAddMinistryOpen(false)
      // Refresh data
      setLoading(true)
      fetchData()
    } catch {
      toast.error(t('errorAdd'))
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-14 rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center px-4">
        <div className="size-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <Users className="size-8 text-muted-foreground" />
        </div>
        <h3 className="font-semibold text-lg mb-1">{t('emptyOverview')}</h3>
      </div>
    )
  }

  const activeGroups = data.groupMemberships.filter(g => g.is_active)
  const activeMinistries = data.ministryMemberships.filter(m => m.is_active)
  const activeServing = data.servingSignups.filter(s => s.status !== 'cancelled')

  const displayName = (name: string, nameAr: string | null) =>
    isRTL ? (nameAr || name) : name

  const roleBadge = (role: string) => {
    if (role === 'leader' || role === 'co_leader') {
      return (
        <Badge variant="secondary" className="text-xs ms-2">
          {role === 'leader' ? t('roleLeader') : t('roleCoLeader')}
        </Badge>
      )
    }
    return null
  }

  return (
    <div className="space-y-6">
      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatCard
          icon={<Users className="h-5 w-5 text-purple-600" />}
          label={t('statActiveGroups')}
          value={data.stats.activeGroups}
          bg="bg-purple-50"
        />
        <StatCard
          icon={<Briefcase className="h-5 w-5 text-amber-600" />}
          label={t('statActiveMinistries')}
          value={data.stats.activeMinistries}
          bg="bg-amber-50"
        />
        <StatCard
          icon={<Heart className="h-5 w-5 text-green-600" />}
          label={t('activeServingRoles')}
          value={activeServing.length}
          bg="bg-green-50"
        />
      </div>

      {/* Groups section */}
      <Section title={t('statActiveGroups')} icon={<Users className="h-4 w-4" />}>
        {activeGroups.length === 0 ? (
          <EmptySection text={t('noGroups')} />
        ) : (
          <div className="space-y-2">
            {activeGroups.map(g => (
              <Link key={g.id} href={`/groups/${g.group_id}`} className="block">
                <div className="flex items-center gap-3 p-3 rounded-xl border border-zinc-200 bg-white hover:border-zinc-300 transition-colors active:bg-zinc-50">
                  <div className="h-9 w-9 rounded-lg bg-purple-50 flex items-center justify-center shrink-0">
                    <Users className="h-4 w-4 text-purple-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-800 truncate">
                      {displayName(g.group_name, g.group_name_ar)}
                    </p>
                    <p className="text-xs text-zinc-500 truncate">
                      {g.group_type}
                      {g.ministry_name && ` · ${displayName(g.ministry_name, g.ministry_name_ar)}`}
                    </p>
                  </div>
                  {roleBadge(g.role_in_group)}
                </div>
              </Link>
            ))}
          </div>
        )}
      </Section>

      {/* Ministries section */}
      <Section title={t('statActiveMinistries')} icon={<Briefcase className="h-4 w-4" />}>
        {activeMinistries.length === 0 ? (
          <EmptySection text={t('noMinistries')} />
        ) : (
          <div className="space-y-2">
            {activeMinistries.map(m => (
              <Link key={m.id} href={`/admin/ministries/${m.ministry_id}`} className="block">
                <div className="flex items-center gap-3 p-3 rounded-xl border border-zinc-200 bg-white hover:border-zinc-300 transition-colors active:bg-zinc-50">
                  <div className="h-9 w-9 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
                    <Briefcase className="h-4 w-4 text-amber-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-800 truncate">
                      {displayName(m.ministry_name, m.ministry_name_ar)}
                    </p>
                  </div>
                  {roleBadge(m.role_in_ministry)}
                </div>
              </Link>
            ))}
          </div>
        )}
      </Section>

      {/* Serving section */}
      <Section title={t('serving')} icon={<Heart className="h-4 w-4" />}>
        {activeServing.length === 0 ? (
          <EmptySection text={t('noServingRoles')} />
        ) : (
          <div className="space-y-2">
            {activeServing.map(s => (
              <div key={s.id} className="flex items-center gap-3 p-3 rounded-xl border border-zinc-200 bg-white">
                <div className="h-9 w-9 rounded-lg bg-green-50 flex items-center justify-center shrink-0">
                  <Heart className="h-4 w-4 text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-800 truncate">
                    {displayName(s.slot_title, s.slot_title_ar)}
                  </p>
                  <p className="text-xs text-zinc-500 truncate">
                    {s.area_name && displayName(s.area_name, s.area_name_ar)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Admin quick actions */}
      {isAdmin && (
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-11"
            onClick={openGroupPicker}
          >
            <Plus className="h-4 w-4 me-1.5" />
            {t('addToGroup')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-11"
            onClick={openMinistryPicker}
          >
            <Plus className="h-4 w-4 me-1.5" />
            {t('addToMinistry')}
          </Button>
        </div>
      )}

      {/* Add to Group Dialog */}
      <Dialog open={addGroupOpen} onOpenChange={setAddGroupOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('selectGroup')}</DialogTitle>
          </DialogHeader>
          {loadingPicker ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : groups.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              {t('noGroups')}
            </p>
          ) : (
            <div className="max-h-[300px] overflow-y-auto space-y-1">
              {groups.map(g => (
                <button
                  key={g.id}
                  onClick={() => addToGroup(g.id)}
                  disabled={isSubmitting}
                  className="flex items-center gap-3 w-full p-3 rounded-lg hover:bg-zinc-50 active:bg-zinc-100 transition-colors text-start h-12"
                >
                  <Users className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-sm font-medium truncate">
                    {displayName(g.name, g.name_ar)}
                  </span>
                </button>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAddGroupOpen(false)} className="h-11">
              {t('cancel')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add to Ministry Dialog */}
      <Dialog open={addMinistryOpen} onOpenChange={setAddMinistryOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('selectMinistry')}</DialogTitle>
          </DialogHeader>
          {loadingPicker ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : ministries.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              {t('noMinistries')}
            </p>
          ) : (
            <div className="max-h-[300px] overflow-y-auto space-y-1">
              {ministries.map(m => (
                <button
                  key={m.id}
                  onClick={() => addToMinistry(m.id)}
                  disabled={isSubmitting}
                  className="flex items-center gap-3 w-full p-3 rounded-lg hover:bg-zinc-50 active:bg-zinc-100 transition-colors text-start h-12"
                >
                  <Briefcase className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-sm font-medium truncate">
                    {displayName(m.name, m.name_ar)}
                  </span>
                </button>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAddMinistryOpen(false)} className="h-11">
              {t('cancel')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function StatCard({ icon, label, value, bg }: {
  icon: React.ReactNode
  label: string
  value: number
  bg: string
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4">
      <div className={`h-9 w-9 rounded-xl ${bg} flex items-center justify-center mb-2`}>
        {icon}
      </div>
      <p className="text-2xl font-bold text-zinc-900 tabular-nums">{value}</p>
      <p className="text-xs text-zinc-500 mt-0.5">{label}</p>
    </div>
  )
}

function Section({ title, icon, children }: {
  title: string
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-muted-foreground">{icon}</span>
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{title}</p>
      </div>
      {children}
    </div>
  )
}

function EmptySection({ text }: { text: string }) {
  return (
    <p className="text-sm text-muted-foreground py-4 text-center">{text}</p>
  )
}
