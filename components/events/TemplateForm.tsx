'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations, useLocale } from 'next-intl'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Stepper } from '@/components/ui/stepper'
import { toast } from 'sonner'
import { Type, Settings, FileText, ListOrdered, Users, StickyNote, Calendar, Layers } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ServiceNeedsPicker, type ServiceNeedDraft } from './ServiceNeedsPicker'
import { SegmentEditor, type SegmentDraft } from './SegmentEditor'
import { CustomFieldsEditor } from './CustomFieldsEditor'
import type { CustomFieldDefinition } from '@/types'

interface TemplateFormProps {
  template?: {
    id: string
    name: string
    name_ar: string | null
    event_type: string
    title: string
    title_ar: string | null
    description: string | null
    description_ar: string | null
    location: string | null
    capacity: number | null
    is_public: boolean
    registration_required: boolean
    notes: string | null
    notes_ar: string | null
    recurrence_type?: string | null
    recurrence_day?: number | null
    default_start_time?: string | null
    default_end_time?: string | null
    custom_fields?: CustomFieldDefinition[] | null
  }
}

const STEPS = [
  { title: 'Basics', titleAr: 'الأساسيات' },
  { title: 'Schedule', titleAr: 'الجدول' },
  { title: 'Defaults', titleAr: 'الإعدادات الافتراضية' },
  { title: 'Service Needs', titleAr: 'احتياجات الخدمة' },
  { title: 'Run of Show', titleAr: 'ترتيب البرنامج' },
  { title: 'Custom Fields', titleAr: 'حقول مخصصة' },
  { title: 'Notes', titleAr: 'ملاحظات' },
  { title: 'Review', titleAr: 'مراجعة' },
]

const EVENT_TYPE_ICONS: Record<string, string> = {
  service: '⛪', conference: '🎤', retreat: '🏕️', workshop: '📝',
  social: '🎉', outreach: '🤝', other: '📌',
}

const DAY_KEYS = ['daySunday', 'dayMonday', 'dayTuesday', 'dayWednesday', 'dayThursday', 'dayFriday', 'daySaturday']

export function TemplateForm({ template }: TemplateFormProps) {
  const router = useRouter()
  const t = useTranslations('templates')
  const te = useTranslations('events')
  const tc = useTranslations('common')
  const tg = useTranslations('groups')
  const locale = useLocale()
  const isRTL = locale.startsWith('ar')
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState(0)

  const [form, setForm] = useState({
    name: template?.name || '',
    name_ar: template?.name_ar || '',
    event_type: template?.event_type || 'service',
    title: template?.title || '',
    title_ar: template?.title_ar || '',
    description: template?.description || '',
    description_ar: template?.description_ar || '',
    location: template?.location || '',
    capacity: template?.capacity ? String(template.capacity) : '',
    is_public: template?.is_public ?? true,
    registration_required: template?.registration_required ?? false,
    notes: template?.notes || '',
    notes_ar: template?.notes_ar || '',
    recurrence_type: template?.recurrence_type || 'none',
    recurrence_day: template?.recurrence_day ?? 0,
    default_start_time: template?.default_start_time || '',
    default_end_time: template?.default_end_time || '',
  })

  const [serviceNeeds, setServiceNeeds] = useState<ServiceNeedDraft[]>([])
  const [segments, setSegments] = useState<SegmentDraft[]>([])
  const [customFields, setCustomFields] = useState<CustomFieldDefinition[]>(template?.custom_fields || [])

  // Load existing needs and segments when editing
  useEffect(() => {
    if (!template?.id) return
    const controller = new AbortController()
    fetch(`/api/templates/${template.id}`, { signal: controller.signal })
      .then(r => r.json())
      .then(d => {
        if (controller.signal.aborted) return
        if (d.data?.needs) {
          setServiceNeeds(
            d.data.needs.map((n: { ministry_id?: string; group_id?: string; volunteers_needed: number; notes?: string; notes_ar?: string; role_presets?: unknown[]; ministry?: { name: string; name_ar?: string }; group?: { name: string; name_ar?: string } }) => ({
              ministry_id: n.ministry_id || undefined,
              group_id: n.group_id || undefined,
              volunteers_needed: n.volunteers_needed,
              notes: n.notes || '',
              notes_ar: n.notes_ar || '',
              role_presets: n.role_presets || [],
              _name: n.ministry?.name || n.group?.name || '',
              _name_ar: n.ministry?.name_ar || n.group?.name_ar || '',
              _type: n.ministry_id ? 'ministry' as const : 'group' as const,
            }))
          )
        }
        if (d.data?.segments) {
          setSegments(
            d.data.segments.map((s: { title: string; title_ar?: string; duration_minutes: number; ministry_id?: string; assigned_to?: string; notes?: string; notes_ar?: string; ministry?: { name: string; name_ar?: string }; profile?: { first_name?: string; last_name?: string } }) => ({
              title: s.title,
              title_ar: s.title_ar || '',
              duration_minutes: s.duration_minutes,
              ministry_id: s.ministry_id,
              assigned_to: s.assigned_to,
              notes: s.notes || '',
              notes_ar: s.notes_ar || '',
              _ministry_name: s.ministry?.name,
              _ministry_name_ar: s.ministry?.name_ar,
              _person_name: s.profile
                ? `${s.profile.first_name || ''} ${s.profile.last_name || ''}`.trim()
                : undefined,
            }))
          )
        }
        if (d.data?.custom_fields) {
          setCustomFields(d.data.custom_fields)
        }
        if (d.data?.recurrence_type) {
          setForm(prev => ({
            ...prev,
            recurrence_type: d.data.recurrence_type || 'none',
            recurrence_day: d.data.recurrence_day ?? 0,
            default_start_time: d.data.default_start_time || '',
            default_end_time: d.data.default_end_time || '',
          }))
        }
      })
      .catch((e) => {
        if (e instanceof Error && e.name !== 'AbortError') {
          console.error('[TemplateForm] Failed to fetch template:', e)
        }
      })
    return () => controller.abort()
  }, [template?.id])

  const eventTypes = ['service', 'conference', 'retreat', 'workshop', 'social', 'outreach', 'other']

  const handleSubmit = async () => {
    if (!form.name || !form.title) {
      toast.error(t('requiredFields'))
      return
    }

    setLoading(true)
    try {
      const payload = {
        name: form.name,
        name_ar: form.name_ar || null,
        event_type: form.event_type,
        title: form.title,
        title_ar: form.title_ar || null,
        description: form.description || null,
        description_ar: form.description_ar || null,
        location: form.location || null,
        capacity: form.capacity ? Number(form.capacity) : null,
        is_public: form.is_public,
        registration_required: form.registration_required,
        notes: form.notes || null,
        notes_ar: form.notes_ar || null,
        recurrence_type: form.recurrence_type,
        recurrence_day: form.recurrence_type !== 'none' ? form.recurrence_day : null,
        default_start_time: form.default_start_time || null,
        default_end_time: form.default_end_time || null,
        custom_fields: customFields.length > 0 ? customFields : [],
      }

      if (template) {
        const res = await fetch(`/api/templates/${template.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}))
          throw new Error(errData.error || 'Failed to update template')
        }

        await fetch(`/api/templates/${template.id}/needs`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            needs: serviceNeeds.map(n => ({
              ministry_id: n.ministry_id || null,
              group_id: n.group_id || null,
              volunteers_needed: n.volunteers_needed,
              notes: n.notes || null,
              notes_ar: n.notes_ar || null,
              role_presets: n.role_presets || [],
            })),
          }),
        })

        await fetch(`/api/templates/${template.id}/segments`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            segments: segments.map(s => ({
              title: s.title,
              title_ar: s.title_ar || null,
              duration_minutes: s.duration_minutes,
              ministry_id: s.ministry_id || null,
              assigned_to: s.assigned_to || null,
              notes: s.notes || null,
              notes_ar: s.notes_ar || null,
            })),
          }),
        })

        toast.success(t('templateUpdated'))
      } else {
        const res = await fetch('/api/templates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...payload,
            needs: serviceNeeds.map(n => ({
              ministry_id: n.ministry_id || null,
              group_id: n.group_id || null,
              volunteers_needed: n.volunteers_needed,
              notes: n.notes || null,
              notes_ar: n.notes_ar || null,
              role_presets: n.role_presets || [],
            })),
            segments: segments.map(s => ({
              title: s.title,
              title_ar: s.title_ar || null,
              duration_minutes: s.duration_minutes,
              ministry_id: s.ministry_id || null,
              assigned_to: s.assigned_to || null,
              notes: s.notes || null,
              notes_ar: s.notes_ar || null,
            })),
          }),
        })
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}))
          throw new Error(errData.error || 'Failed to create template')
        }
        toast.success(t('templateCreated'))
      }

      router.push('/admin/templates')
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('errorGeneral'))
    } finally {
      setLoading(false)
    }
  }

  const canProceed = step === 0 ? !!(form.name && form.title) : true
  const totalVolunteers = serviceNeeds.reduce((sum, n) => sum + n.volunteers_needed, 0)
  const totalDuration = segments.reduce((sum, s) => sum + (s.duration_minutes || 0), 0)

  const recurrenceOptions = [
    { value: 'none', label: t('recurrenceNone') },
    { value: 'weekly', label: t('recurrenceWeekly') },
    { value: 'biweekly', label: t('recurrenceBiweekly') },
    { value: 'monthly', label: t('recurrenceMonthly') },
  ]

  return (
    <Stepper
      steps={STEPS}
      currentStep={step}
      onNext={() => setStep(s => Math.min(s + 1, STEPS.length - 1))}
      onBack={() => step === 0 ? router.back() : setStep(s => s - 1)}
      onSubmit={handleSubmit}
      isSubmitting={loading}
      submitLabel={template ? t('updateTemplate') : t('createTemplate')}
      submitLabelAr={template ? t('updateTemplate') : t('createTemplate')}
      canProceed={canProceed}
    >
      {/* Step 0: Basics */}
      {step === 0 && (
        <div className="space-y-5 pt-4">
          <div>
            <div className="flex items-center gap-3 text-zinc-500 mb-2">
              <Type className="h-5 w-5" />
              <span className="text-sm font-medium">{t('templateName')} *</span>
            </div>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder={t('templateNamePlaceholder')}
              dir="ltr"
              className="text-lg min-h-[48px]"
            />
          </div>
          <div>
            <Label className="text-sm text-zinc-500 mb-1 block">{t('templateNameAr')}</Label>
            <Input
              value={form.name_ar}
              onChange={(e) => setForm({ ...form, name_ar: e.target.value })}
              dir="rtl"
              className="min-h-[48px]"
            />
          </div>
          <div>
            <div className="flex items-center gap-3 text-zinc-500 mb-2">
              <Type className="h-5 w-5" />
              <span className="text-sm font-medium">{t('defaultTitle')} *</span>
            </div>
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder={t('templateNameArPlaceholder')}
              dir="ltr"
              className="min-h-[48px]"
            />
          </div>
          <div>
            <Label className="text-sm text-zinc-500 mb-1 block">{t('defaultTitleAr')}</Label>
            <Input
              value={form.title_ar}
              onChange={(e) => setForm({ ...form, title_ar: e.target.value })}
              dir="rtl"
              className="min-h-[48px]"
            />
          </div>
          <div>
            <Label className="text-sm text-zinc-500 mb-2 block">{te('eventType')}</Label>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {eventTypes.map(type => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setForm({ ...form, event_type: type })}
                  className={cn(
                    'flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all text-sm',
                    form.event_type === type
                      ? 'border-primary bg-primary/5 font-medium'
                      : 'border-zinc-100 hover:border-zinc-200'
                  )}
                >
                  <span className="text-xl">{EVENT_TYPE_ICONS[type]}</span>
                  <span className="text-xs">{te(`type_${type}`)}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Step 1: Schedule */}
      {step === 1 && (
        <div className="space-y-5 pt-4">
          <div>
            <div className="flex items-center gap-3 text-zinc-500 mb-2">
              <Calendar className="h-5 w-5" />
              <span className="text-sm font-medium">{t('recurrence')}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {recurrenceOptions.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setForm({ ...form, recurrence_type: opt.value })}
                  className={cn(
                    'py-2.5 px-3 rounded-xl text-sm font-medium border-2 transition-all',
                    form.recurrence_type === opt.value
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-zinc-200 text-zinc-500 hover:border-zinc-300'
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {form.recurrence_type !== 'none' && (
            <div>
              <Label className="text-sm text-zinc-500 mb-2 block">{t('recurrenceDay')}</Label>
              <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                {DAY_KEYS.map((dayKey, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setForm({ ...form, recurrence_day: i })}
                    className={cn(
                      'py-2 px-1 rounded-lg text-xs font-medium border-2 transition-all',
                      form.recurrence_day === i
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-zinc-200 text-zinc-500 hover:border-zinc-300'
                    )}
                  >
                    {tg(dayKey)}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <Label className="text-sm text-zinc-500 mb-1 block">{t('defaultStartTime')}</Label>
            <Input
              type="time"
              value={form.default_start_time}
              onChange={e => setForm({ ...form, default_start_time: e.target.value })}
              dir="ltr"
              className="min-h-[48px]"
            />
          </div>

          <div>
            <Label className="text-sm text-zinc-500 mb-1 block">{t('defaultEndTime')}</Label>
            <Input
              type="time"
              value={form.default_end_time}
              onChange={e => setForm({ ...form, default_end_time: e.target.value })}
              dir="ltr"
              className="min-h-[48px]"
            />
          </div>
        </div>
      )}

      {/* Step 2: Defaults */}
      {step === 2 && (
        <div className="space-y-5 pt-4">
          <div>
            <div className="flex items-center gap-3 text-zinc-500 mb-2">
              <FileText className="h-5 w-5" />
              <span className="text-sm font-medium">{te('descriptionEn')}</span>
            </div>
            <Textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
              dir="ltr"
            />
          </div>
          <div>
            <Label className="text-sm text-zinc-500 mb-1 block">{te('descriptionAr')}</Label>
            <Textarea
              value={form.description_ar}
              onChange={(e) => setForm({ ...form, description_ar: e.target.value })}
              rows={3}
              dir="rtl"
            />
          </div>
          <div>
            <Label className="text-sm text-zinc-500 mb-1 block">{te('location')}</Label>
            <Input
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              className="min-h-[48px]"
            />
          </div>
          <div>
            <Label className="text-sm text-zinc-500 mb-1 block">{te('capacity')}</Label>
            <Input
              type="number"
              value={form.capacity}
              onChange={(e) => setForm({ ...form, capacity: e.target.value })}
              dir="ltr"
              className="min-h-[48px]"
            />
          </div>
          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-zinc-50">
              <Switch
                checked={form.is_public}
                onCheckedChange={(checked) => setForm({ ...form, is_public: checked })}
              />
              <Label>{te('isPublic')}</Label>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-zinc-50">
              <Switch
                checked={form.registration_required}
                onCheckedChange={(checked) => setForm({ ...form, registration_required: checked })}
              />
              <Label>{te('registrationRequired')}</Label>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Service Needs */}
      {step === 3 && (
        <ServiceNeedsPicker
          serviceNeeds={serviceNeeds}
          onChange={setServiceNeeds}
        />
      )}

      {/* Step 4: Run of Show */}
      {step === 4 && (
        <SegmentEditor
          segments={segments}
          onChange={setSegments}
        />
      )}

      {/* Step 5: Custom Fields */}
      {step === 5 && (
        <CustomFieldsEditor
          fields={customFields}
          onChange={setCustomFields}
        />
      )}

      {/* Step 6: Notes */}
      {step === 6 && (
        <div className="space-y-5 pt-4">
          <div>
            <div className="flex items-center gap-3 text-zinc-500 mb-2">
              <StickyNote className="h-5 w-5" />
              <span className="text-sm font-medium">{t('specialNotes')}</span>
            </div>
            <Textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={4}
              dir="ltr"
              placeholder={t('templateNotesPlaceholder')}
            />
          </div>
          <div>
            <Label className="text-sm text-zinc-500 mb-1 block">{t('specialNotesAr')}</Label>
            <Textarea
              value={form.notes_ar}
              onChange={(e) => setForm({ ...form, notes_ar: e.target.value })}
              rows={4}
              dir="rtl"
            />
          </div>
        </div>
      )}

      {/* Step 7: Review */}
      {step === 7 && (
        <div className="space-y-3 pt-4">
          <ReviewItem icon={<Type className="h-4 w-4" />} label={t('templateName')} value={form.name} />
          <ReviewItem icon={<Type className="h-4 w-4" />} label={t('defaultTitle')} value={form.title} />
          <ReviewItem icon={<Settings className="h-4 w-4" />} label={te('eventType')} value={`${EVENT_TYPE_ICONS[form.event_type]} ${te(`type_${form.event_type}`)}`} />
          {form.recurrence_type !== 'none' && (
            <ReviewItem
              icon={<Calendar className="h-4 w-4" />}
              label={t('schedule')}
              value={`${recurrenceOptions.find(o => o.value === form.recurrence_type)?.label} · ${tg(DAY_KEYS[form.recurrence_day])}${form.default_start_time ? ` · ${form.default_start_time}` : ''}`}
            />
          )}
          {form.location && <ReviewItem icon={<Settings className="h-4 w-4" />} label={te('location')} value={form.location} />}
          {serviceNeeds.length > 0 && (
            <ReviewItem
              icon={<Users className="h-4 w-4" />}
              label={te('serviceNeeds')}
              value={`${serviceNeeds.length} ${te('serviceNeeds').toLowerCase()} · ${totalVolunteers} ${te('volunteersNeeded').toLowerCase()}`}
            />
          )}
          {segments.length > 0 && (
            <ReviewItem
              icon={<ListOrdered className="h-4 w-4" />}
              label={t('runOfShow')}
              value={`${segments.length} ${t('segments')} · ${totalDuration} ${t('min')}`}
            />
          )}
          {customFields.length > 0 && (
            <ReviewItem
              icon={<Layers className="h-4 w-4" />}
              label={t('customFields')}
              value={`${customFields.length} ${t('customFields').toLowerCase()}`}
            />
          )}
          {form.notes && (
            <ReviewItem icon={<StickyNote className="h-4 w-4" />} label={t('specialNotes')} value={form.notes} />
          )}
        </div>
      )}
    </Stepper>
  )
}

function ReviewItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-zinc-50 border border-zinc-100">
      <div className="text-zinc-400 mt-0.5">{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-zinc-400 font-medium">{label}</p>
        <p className="text-sm text-zinc-800 mt-0.5">{value}</p>
      </div>
    </div>
  )
}
