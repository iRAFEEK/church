'use client'

import { useState, useEffect } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { PermissionToggleGrid } from '@/components/permissions/PermissionToggleGrid'
import { ALL_PERMISSIONS, HARDCODED_ROLE_DEFAULTS, PERMISSION_LABELS } from '@/lib/permissions'
import type { PermissionKey, UserRole } from '@/types'
import { Loader2, Shield, Users, UserCheck, User } from 'lucide-react'

const CONFIGURABLE_ROLES: { role: UserRole; icon: typeof Shield }[] = [
  { role: 'member', icon: User },
  { role: 'group_leader', icon: Users },
  { role: 'ministry_leader', icon: UserCheck },
]

const ROLE_LABELS: Record<string, { en: string; ar: string }> = {
  member: { en: 'Member', ar: 'عضو' },
  group_leader: { en: 'Group Leader', ar: 'قائد مجموعة' },
  ministry_leader: { en: 'Ministry Leader', ar: 'قائد خدمة' },
}

export default function RoleDefaultsPage() {
  const t = useTranslations('permissions')
  const locale = useLocale()
  const isRTL = locale.startsWith('ar')

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [roleData, setRoleData] = useState<Record<string, {
    hardcoded: Record<PermissionKey, boolean>
    churchOverride: Record<string, boolean> | null
    effective: Record<PermissionKey, boolean>
  }>>({})

  useEffect(() => {
    const controller = new AbortController()
    async function load() {
      try {
        const res = await fetch('/api/permissions/role-defaults', { signal: controller.signal })
        if (res.ok && !controller.signal.aborted) {
          setRoleData(await res.json())
        }
      } catch (e) {
        if (e instanceof Error && e.name !== 'AbortError') {
          toast.error(isRTL ? 'فشل تحميل البيانات' : 'Failed to load data')
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }
    load()
    return () => controller.abort()
  }, [isRTL])

  async function handleSave(role: string) {
    setSaving(role)
    const data = roleData[role]
    if (!data) return

    // Compute only the overrides (differences from hardcoded)
    const overrides: Record<string, boolean> = {}
    for (const key of ALL_PERMISSIONS) {
      if (data.effective[key] !== HARDCODED_ROLE_DEFAULTS[role as keyof typeof HARDCODED_ROLE_DEFAULTS][key]) {
        overrides[key] = data.effective[key]
      }
    }

    try {
      const res = await fetch('/api/permissions/role-defaults', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, permissions: Object.keys(overrides).length > 0 ? overrides : {} }),
      })
      if (!res.ok) throw new Error('Failed')
      toast.success(t('saved'))
    } catch {
      toast.error(t('saveError'))
    } finally {
      setSaving(null)
    }
  }

  function handleChange(role: string, key: PermissionKey, value: boolean) {
    setRoleData(prev => ({
      ...prev,
      [role]: {
        ...prev[role],
        effective: { ...prev[role].effective, [key]: value },
      },
    }))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto pb-24">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">{t('roleDefaultsTitle')}</h1>
        <p className="text-sm text-zinc-500 mt-1">{t('roleDefaultsSubtitle')}</p>
      </div>

      {CONFIGURABLE_ROLES.map(({ role, icon: Icon }) => {
        const data = roleData[role]
        if (!data) return null

        const roleLabel = isRTL ? ROLE_LABELS[role].ar : ROLE_LABELS[role].en

        return (
          <Card key={role}>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Icon className="h-4 w-4" />
                {roleLabel}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <PermissionToggleGrid
                values={data.effective}
                defaults={HARDCODED_ROLE_DEFAULTS[role as keyof typeof HARDCODED_ROLE_DEFAULTS]}
                onChange={(key, val) => handleChange(role, key, val)}
              />
              <Button
                onClick={() => handleSave(role)}
                disabled={saving === role}
                className="w-full"
              >
                {saving === role && <Loader2 className="h-4 w-4 animate-spin me-2" />}
                {t('savePermissions')}
              </Button>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
