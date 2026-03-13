'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { PermissionToggleGrid } from './PermissionToggleGrid'
import { HARDCODED_ROLE_DEFAULTS, ALL_PERMISSIONS } from '@/lib/permissions'
import type { PermissionKey, UserRole, PermissionMap } from '@/types'
import { Loader2 } from 'lucide-react'

interface MemberPermissionEditorProps {
  memberId: string
  memberRole: UserRole
}

export function MemberPermissionEditor({ memberId, memberRole }: MemberPermissionEditorProps) {
  const t = useTranslations('permissions')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [roleDefaults, setRoleDefaults] = useState<Record<PermissionKey, boolean>>(
    HARDCODED_ROLE_DEFAULTS[memberRole]
  )
  const [userOverrides, setUserOverrides] = useState<PermissionMap>({})
  const [values, setValues] = useState<Record<PermissionKey, boolean>>(
    HARDCODED_ROLE_DEFAULTS[memberRole]
  )

  useEffect(() => {
    const controller = new AbortController()
    async function load() {
      try {
        const res = await fetch(`/api/permissions/user/${memberId}`, { signal: controller.signal })
        if (res.ok && !controller.signal.aborted) {
          const data = await res.json()
          setRoleDefaults(data.roleDefaults ?? HARDCODED_ROLE_DEFAULTS[memberRole])
          setUserOverrides(data.userOverrides ?? {})
          setValues(data.resolved ?? HARDCODED_ROLE_DEFAULTS[memberRole])
        }
      } catch (e) {
        if (e instanceof Error && e.name !== 'AbortError') {
          // Use defaults
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }
    load()
    return () => controller.abort()
  }, [memberId, memberRole])

  function handleChange(key: PermissionKey, value: boolean) {
    const newValues = { ...values, [key]: value }
    setValues(newValues)

    // Track as override only if different from role default
    const newOverrides = { ...userOverrides }
    if (value !== roleDefaults[key]) {
      newOverrides[key] = value
    } else {
      delete newOverrides[key]
    }
    setUserOverrides(newOverrides)
  }

  async function handleSave() {
    setSaving(true)
    try {
      const res = await fetch(`/api/permissions/user/${memberId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissions: Object.keys(userOverrides).length > 0 ? userOverrides : null }),
      })
      if (!res.ok) throw new Error('Failed to save')
      toast.success(t('saved'))
    } catch {
      toast.error(t('saveError'))
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (memberRole === 'super_admin') {
    return (
      <p className="text-sm text-muted-foreground py-4 text-center">
        {t('superAdminNote')}
      </p>
    )
  }

  return (
    <div className="space-y-4">
      <PermissionToggleGrid
        values={values}
        defaults={roleDefaults}
        onChange={handleChange}
      />
      <Button onClick={handleSave} disabled={saving} className="w-full">
        {saving && <Loader2 className="h-4 w-4 animate-spin me-2" />}
        {t('savePermissions')}
      </Button>
    </div>
  )
}
