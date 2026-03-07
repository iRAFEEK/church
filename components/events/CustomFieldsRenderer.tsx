'use client'

import { useLocale } from 'next-intl'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import type { CustomFieldDefinition } from '@/types'

interface CustomFieldsRendererProps {
  fields: CustomFieldDefinition[]
  values: Record<string, any>
  onChange: (values: Record<string, any>) => void
}

export function CustomFieldsRenderer({ fields, values, onChange }: CustomFieldsRendererProps) {
  const locale = useLocale()
  const isRTL = locale === 'ar'

  if (fields.length === 0) return null

  const handleChange = (fieldId: string, value: any) => {
    onChange({ ...values, [fieldId]: value })
  }

  return (
    <div className="space-y-4">
      {fields.map(field => {
        const label = isRTL ? (field.label_ar || field.label) : field.label
        const value = values[field.id]

        return (
          <div key={field.id}>
            <Label className="text-sm text-zinc-500 mb-1 block">
              {label}{field.required ? ' *' : ''}
            </Label>

            {field.type === 'text' && (
              <Input
                value={value || ''}
                onChange={e => handleChange(field.id, e.target.value)}
                className="min-h-[44px]"
              />
            )}

            {field.type === 'number' && (
              <Input
                type="number"
                value={value || ''}
                onChange={e => handleChange(field.id, e.target.value)}
                dir="ltr"
                className="min-h-[44px]"
              />
            )}

            {field.type === 'select' && (
              <select
                value={value || ''}
                onChange={e => handleChange(field.id, e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-zinc-200 bg-white text-sm"
              >
                <option value="">—</option>
                {(field.options || []).map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            )}

            {field.type === 'boolean' && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-zinc-50">
                <Switch
                  checked={!!value}
                  onCheckedChange={checked => handleChange(field.id, checked)}
                />
                <span className="text-sm text-zinc-700">{label}</span>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
