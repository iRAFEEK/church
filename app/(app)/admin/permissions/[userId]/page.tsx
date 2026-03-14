'use client'

import { useState, useEffect } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { PermissionToggleGrid } from '@/components/permissions/PermissionToggleGrid'
import { HARDCODED_ROLE_DEFAULTS } from '@/lib/permissions'
import type { PermissionKey, UserRole, PermissionMap } from '@/types'
import { ArrowLeft, Shield, Loader2, CheckCircle2 } from 'lucide-react'

const ROLE_LABELS: Record<string, { en: string; ar: string }> = {
  member: { en: 'Member', ar: 'عضو' },
  group_leader: { en: 'Group Leader', ar: 'قائد مجموعة' },
  ministry_leader: { en: 'Ministry Leader', ar: 'قائد خدمة' },
  super_admin: { en: 'Super Admin', ar: 'مسؤول' },
}

interface MemberData {
  id: string
  first_name: string | null
  last_name: string | null
  first_name_ar: string | null
  last_name_ar: string | null
  photo_url: string | null
  role: UserRole
  email: string | null
}

export default function UserPermissionPage() {
  const t = useTranslations('permissions')
  const locale = useLocale()
  const isAr = locale.startsWith('ar')
  const params = useParams()
  const userId = params.userId as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [member, setMember] = useState<MemberData | null>(null)
  const [roleDefaults, setRoleDefaults] = useState<Record<PermissionKey, boolean>>(HARDCODED_ROLE_DEFAULTS.member)
  const [userOverrides, setUserOverrides] = useState<PermissionMap>({})
  const [values, setValues] = useState<Record<PermissionKey, boolean>>(HARDCODED_ROLE_DEFAULTS.member)

  useEffect(() => {
    const controller = new AbortController()
    async function load() {
      try {
        const profileRes = await fetch(`/api/permissions/user/${userId}`, { signal: controller.signal })
        if (profileRes.ok && !controller.signal.aborted) {
          const data = await profileRes.json()
          setMember(data.member)
          const role = (data.member?.role ?? 'member') as UserRole
          setRoleDefaults(data.roleDefaults ?? HARDCODED_ROLE_DEFAULTS[role])
          setUserOverrides(data.userOverrides ?? {})
          setValues(data.resolved ?? HARDCODED_ROLE_DEFAULTS[role])
        }
      } catch (e) {
        if (e instanceof Error && e.name !== 'AbortError') { /* fallback */ }
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }
    load()
    return () => controller.abort()
  }, [userId])

  function handleChange(key: PermissionKey, value: boolean) {
    const newValues = { ...values, [key]: value }
    setValues(newValues)

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
      const res = await fetch(`/api/permissions/user/${userId}`, {
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
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!member) {
    return (
      <div className="text-center py-24 text-muted-foreground">
        {t('memberNotFound')}
      </div>
    )
  }

  const name = isAr
    ? `${member.first_name_ar || member.first_name || ''} ${member.last_name_ar || member.last_name || ''}`.trim()
    : `${member.first_name || ''} ${member.last_name || ''}`.trim()
  const initials = name ? name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : '?'
  const roleLabel = isAr ? ROLE_LABELS[member.role]?.ar : ROLE_LABELS[member.role]?.en

  const overrideCount = Object.keys(userOverrides).length
  const isSuperAdmin = member.role === 'super_admin'

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Back */}
      <Link href="/admin/permissions" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" />
        {t('summaryTitle')}
      </Link>

      {/* Member Info */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-14 w-14">
              <AvatarImage src={member.photo_url || undefined} />
              <AvatarFallback className="text-lg">{initials}</AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-xl font-bold">{name || member.email || '—'}</h1>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary">{roleLabel}</Badge>
                {overrideCount > 0 && (
                  <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                    {overrideCount} {isAr ? 'تخصيص' : 'custom'}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Permissions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4" />
            {t('userPermissionsTitle')}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {t('userPermissionsDesc')}
          </p>
        </CardHeader>
        <CardContent>
          {isSuperAdmin ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-4 justify-center">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              {t('superAdminNote')}
            </div>
          ) : (
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
          )}
        </CardContent>
      </Card>
    </div>
  )
}
