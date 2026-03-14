'use client'

import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { ALL_PERMISSIONS, PERMISSION_LABELS } from '@/lib/permissions'
import type { PermissionKey } from '@/types'
import { useLocale } from 'next-intl'

interface PermissionToggleGridProps {
  values: Record<PermissionKey, boolean>
  defaults?: Record<PermissionKey, boolean>
  onChange: (key: PermissionKey, value: boolean) => void
  disabled?: boolean
}

export function PermissionToggleGrid({
  values,
  defaults,
  onChange,
  disabled = false,
}: PermissionToggleGridProps) {
  const locale = useLocale()
  const isRTL = locale.startsWith('ar')

  return (
    <div className="grid gap-3">
      {ALL_PERMISSIONS.map((key) => {
        const label = isRTL ? PERMISSION_LABELS[key].ar : PERMISSION_LABELS[key].en
        const isDefault = defaults ? defaults[key] === values[key] : false
        const checked = values[key] ?? false

        return (
          <div
            key={key}
            className="flex items-center justify-between gap-3 py-2 px-3 rounded-lg border border-border"
          >
            <div className="flex-1 min-w-0">
              <Label
                htmlFor={`perm-${key}`}
                className={`text-sm cursor-pointer ${isDefault ? 'text-muted-foreground' : 'font-medium'}`}
              >
                {label}
              </Label>
              {isDefault && defaults && (
                <span className="text-xs text-muted-foreground/60 ms-2">
                  {isRTL ? 'افتراضي' : 'Default'}
                </span>
              )}
            </div>
            <Switch
              id={`perm-${key}`}
              checked={checked}
              onCheckedChange={(val) => onChange(key, val)}
              disabled={disabled}
            />
          </div>
        )
      })}
    </div>
  )
}
