'use client'

import { useState } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Plus, Trash2, Pencil, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { CustomFieldDefinition } from '@/types'

interface CustomFieldsEditorProps {
  fields: CustomFieldDefinition[]
  onChange: (fields: CustomFieldDefinition[]) => void
}

const FIELD_TYPES = ['text', 'number', 'select', 'boolean'] as const

export function CustomFieldsEditor({ fields, onChange }: CustomFieldsEditorProps) {
  const t = useTranslations('templates')
  const locale = useLocale()
  const isRTL = locale === 'ar'

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editIndex, setEditIndex] = useState<number | null>(null)

  const [label, setLabel] = useState('')
  const [labelAr, setLabelAr] = useState('')
  const [fieldType, setFieldType] = useState<CustomFieldDefinition['type']>('text')
  const [options, setOptions] = useState('')
  const [required, setRequired] = useState(false)

  const openAdd = () => {
    setEditIndex(null)
    setLabel('')
    setLabelAr('')
    setFieldType('text')
    setOptions('')
    setRequired(false)
    setDialogOpen(true)
  }

  const openEdit = (index: number) => {
    const f = fields[index]
    setEditIndex(index)
    setLabel(f.label)
    setLabelAr(f.label_ar)
    setFieldType(f.type)
    setOptions(f.options?.join(', ') || '')
    setRequired(f.required)
    setDialogOpen(true)
  }

  const handleSave = () => {
    if (!label) return

    const field: CustomFieldDefinition = {
      id: editIndex !== null ? fields[editIndex].id : crypto.randomUUID(),
      label,
      label_ar: labelAr,
      type: fieldType,
      options: fieldType === 'select' ? options.split(',').map(o => o.trim()).filter(Boolean) : undefined,
      required,
    }

    if (editIndex !== null) {
      const updated = [...fields]
      updated[editIndex] = field
      onChange(updated)
    } else {
      onChange([...fields, field])
    }
    setDialogOpen(false)
  }

  const handleRemove = (index: number) => {
    onChange(fields.filter((_, i) => i !== index))
  }

  const typeLabels: Record<string, string> = {
    text: t('fieldTypeText'),
    number: t('fieldTypeNumber'),
    select: t('fieldTypeSelect'),
    boolean: t('fieldTypeBoolean'),
  }

  return (
    <div className="space-y-4 pt-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-zinc-500">
          <FileText className="h-5 w-5" />
          <span className="text-sm font-medium">{t('customFields')}</span>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={openAdd}>
          <Plus className="h-4 w-4 me-1" />
          {t('addCustomField')}
        </Button>
      </div>

      {fields.length === 0 ? (
        <div className="text-center py-8 text-zinc-400 text-sm border-2 border-dashed border-zinc-200 rounded-xl">
          {t('customFields')}
        </div>
      ) : (
        <div className="space-y-2">
          {fields.map((field, i) => (
            <div key={field.id} className="flex items-center gap-3 p-3 rounded-xl border border-zinc-200 bg-zinc-50">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-zinc-800">
                  {isRTL ? (field.label_ar || field.label) : field.label}
                </p>
                <p className="text-xs text-zinc-500">
                  {typeLabels[field.type]}{field.required ? ' *' : ''}
                  {field.type === 'select' && field.options ? ` (${field.options.length} options)` : ''}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <button type="button" onClick={() => openEdit(i)} className="p-2 rounded-lg hover:bg-zinc-200 text-zinc-400 hover:text-zinc-600 transition-colors">
                  <Pencil className="h-4 w-4" />
                </button>
                <button type="button" onClick={() => handleRemove(i)} className="p-2 rounded-lg hover:bg-red-50 text-zinc-400 hover:text-red-500 transition-colors">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className={cn('sm:max-w-md', isRTL && 'rtl')}>
          <DialogHeader>
            <DialogTitle>{editIndex !== null ? t('addCustomField') : t('addCustomField')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-sm text-zinc-500 mb-1 block">{t('fieldLabel')} *</Label>
              <Input value={label} onChange={e => setLabel(e.target.value)} dir="ltr" />
            </div>
            <div>
              <Label className="text-sm text-zinc-500 mb-1 block">{t('fieldLabelAr')}</Label>
              <Input value={labelAr} onChange={e => setLabelAr(e.target.value)} dir="rtl" />
            </div>
            <div>
              <Label className="text-sm text-zinc-500 mb-2 block">{t('fieldType')}</Label>
              <div className="grid grid-cols-2 gap-2">
                {FIELD_TYPES.map(ft => (
                  <button
                    key={ft}
                    type="button"
                    onClick={() => setFieldType(ft)}
                    className={cn(
                      'py-2 px-3 rounded-lg text-sm font-medium border-2 transition-all',
                      fieldType === ft
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-zinc-200 text-zinc-500 hover:border-zinc-300'
                    )}
                  >
                    {typeLabels[ft]}
                  </button>
                ))}
              </div>
            </div>
            {fieldType === 'select' && (
              <div>
                <Label className="text-sm text-zinc-500 mb-1 block">{t('fieldOptions')}</Label>
                <Input value={options} onChange={e => setOptions(e.target.value)} placeholder="Option 1, Option 2, Option 3" dir="ltr" />
              </div>
            )}
            <div className="flex items-center gap-3 p-3 rounded-lg bg-zinc-50">
              <Switch checked={required} onCheckedChange={setRequired} />
              <Label>{t('fieldRequired')}</Label>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" onClick={handleSave} disabled={!label} className="w-full">
              {t('addCustomField')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
