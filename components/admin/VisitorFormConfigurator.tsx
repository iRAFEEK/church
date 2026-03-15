'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Loader2, Save, ClipboardList } from 'lucide-react'
import type { VisitorFormField } from '@/lib/schemas/visitor-form-config'

interface Props {
  initialConfig: { fields: VisitorFormField[] }
}

const ALWAYS_REQUIRED_KEYS = ['first_name', 'last_name']

export function VisitorFormConfigurator({ initialConfig }: Props) {
  const t = useTranslations('visitorForm')
  const [fields, setFields] = useState<VisitorFormField[]>(initialConfig.fields)
  const [saving, setSaving] = useState(false)

  const toggleEnabled = (key: string) => {
    setFields(prev => prev.map(f =>
      f.key === key ? { ...f, enabled: !f.enabled, required: !f.enabled ? f.required : false } : f
    ))
  }

  const toggleRequired = (key: string) => {
    setFields(prev => prev.map(f =>
      f.key === key ? { ...f, required: !f.required } : f
    ))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/churches/visitor-form-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields }),
      })
      if (!res.ok) {
        const err = await res.json()
        toast.error(err.error || t('saveFailed'))
        return
      }
      toast.success(t('saveSuccess'))
    } catch {
      toast.error(t('saveFailed'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <ClipboardList className="w-4 h-4" />
          {t('title')}
        </CardTitle>
        <CardDescription>{t('description')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {fields.map(field => {
          const isLocked = ALWAYS_REQUIRED_KEYS.includes(field.key)
          return (
            <div
              key={field.key}
              className={`flex items-center justify-between py-3 px-3 rounded-lg border ${field.enabled ? 'bg-background' : 'bg-muted/30'}`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <Switch
                  checked={field.enabled}
                  onCheckedChange={() => toggleEnabled(field.key)}
                  disabled={isLocked}
                />
                <div>
                  <Label className="text-sm font-medium">{t(`field_${field.key}`)}</Label>
                  {isLocked && (
                    <Badge variant="secondary" className="ms-2 text-[10px]">{t('alwaysRequired')}</Badge>
                  )}
                </div>
              </div>

              {field.enabled && !isLocked && (
                <div className="flex items-center gap-2 shrink-0">
                  <Label htmlFor={`req-${field.key}`} className="text-xs text-muted-foreground">
                    {t('required')}
                  </Label>
                  <Switch
                    id={`req-${field.key}`}
                    checked={field.required}
                    onCheckedChange={() => toggleRequired(field.key)}
                  />
                </div>
              )}
            </div>
          )
        })}

        <Button onClick={handleSave} disabled={saving} className="w-full">
          {saving ? <Loader2 className="w-4 h-4 animate-spin me-2" /> : <Save className="w-4 h-4 me-2" />}
          {saving ? t('saving') : t('save')}
        </Button>
      </CardContent>
    </Card>
  )
}
