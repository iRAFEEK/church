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
import { Calendar, MapPin, FileText, Settings, Type, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ServiceNeedsPicker, type ServiceNeedDraft } from './ServiceNeedsPicker'
import { EventAudienceSelector, type AudienceConfig } from './EventAudienceSelector'

interface EventFormProps {
  event?: {
    id: string
    title: string
    title_ar: string
    description: string | null
    description_ar: string | null
    event_type: string
    starts_at: string
    ends_at: string | null
    location: string | null
    capacity: number | null
    is_public: boolean
    registration_required: boolean
    registration_closes_at: string | null
    status: string
  }
}

function getSteps(t: (key: string) => string) {
  return [
    { title: t('stepTitleAndType'), titleAr: t('stepTitleAndType') },
    { title: t('stepWhen'), titleAr: t('stepWhen') },
    { title: t('stepWhere'), titleAr: t('stepWhere') },
    { title: t('stepDetails'), titleAr: t('stepDetails') },
    { title: t('stepAudience'), titleAr: t('stepAudience') },
    { title: t('stepServiceNeeds'), titleAr: t('stepServiceNeeds') },
    { title: t('stepReview'), titleAr: t('stepReview') },
  ]
}

const EVENT_TYPE_ICONS: Record<string, string> = {
  service: '⛪', conference: '🎤', retreat: '🏕️', workshop: '📝',
  social: '🎉', outreach: '🤝', other: '📌',
}

export function EventForm({ event }: EventFormProps) {
  const router = useRouter()
  const t = useTranslations('events')
  const tc = useTranslations('common')
  const locale = useLocale()
  const isRTL = locale.startsWith('ar')
  const STEPS = getSteps(t)
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState(0)

  const [form, setForm] = useState({
    title: event?.title || '',
    title_ar: event?.title_ar || '',
    description: event?.description || '',
    description_ar: event?.description_ar || '',
    event_type: event?.event_type || 'service',
    starts_at: event?.starts_at ? event.starts_at.slice(0, 16) : '',
    ends_at: event?.ends_at ? event.ends_at.slice(0, 16) : '',
    location: event?.location || '',
    capacity: event?.capacity || '',
    is_public: event?.is_public ?? true,
    registration_required: event?.registration_required ?? false,
    registration_closes_at: event?.registration_closes_at ? event.registration_closes_at.slice(0, 16) : '',
  })

  const [serviceNeeds, setServiceNeeds] = useState<ServiceNeedDraft[]>([])
  const [audience, setAudience] = useState<AudienceConfig>({
    visibility: 'all',
    hide_from_non_invited: false,
    ministry_ids: [],
    group_ids: [],
  })

  // Load existing audience config when editing
  useEffect(() => {
    if (!event?.id) return
    const controller = new AbortController()
    fetch(`/api/events/${event.id}`, { signal: controller.signal })
      .then(r => r.json())
      .then(d => {
        if (controller.signal.aborted) return
        const evt = d.data
        if (evt?.visibility === 'restricted') {
          const targets = evt.event_visibility_targets || []
          setAudience({
            visibility: 'restricted',
            hide_from_non_invited: evt.hide_from_non_invited ?? false,
            ministry_ids: targets.filter((t: { target_type: string; target_id: string }) => t.target_type === 'ministry').map((t: { target_type: string; target_id: string }) => t.target_id),
            group_ids: targets.filter((t: { target_type: string; target_id: string }) => t.target_type === 'group').map((t: { target_type: string; target_id: string }) => t.target_id),
          })
        }
      })
      .catch((e) => {
        if (e instanceof Error && e.name !== 'AbortError') {
          console.error('[EventForm] Failed to fetch event:', e)
        }
      })
    return () => controller.abort()
  }, [event?.id])

  // Load existing service needs when editing
  useEffect(() => {
    if (!event?.id) return
    const controller = new AbortController()
    fetch(`/api/events/${event.id}/service-needs`, { signal: controller.signal })
      .then(r => r.json())
      .then(d => {
        if (controller.signal.aborted) return
        if (d.data) {
          setServiceNeeds(
            d.data.map((n: { ministry_id?: string; group_id?: string; volunteers_needed: number; notes?: string; notes_ar?: string; ministry?: { name: string; name_ar?: string }; group?: { name: string; name_ar?: string } }) => ({
              ministry_id: n.ministry_id || undefined,
              group_id: n.group_id || undefined,
              volunteers_needed: n.volunteers_needed,
              notes: n.notes || '',
              notes_ar: n.notes_ar || '',
              _name: n.ministry?.name || n.group?.name || '',
              _name_ar: n.ministry?.name_ar || n.group?.name_ar || '',
              _type: n.ministry_id ? 'ministry' as const : 'group' as const,
            }))
          )
        }
      })
      .catch((e) => {
        if (e instanceof Error && e.name !== 'AbortError') {
          console.error('[EventForm] Failed to fetch service needs:', e)
        }
      })
    return () => controller.abort()
  }, [event?.id])

  const eventTypes = ['service', 'conference', 'retreat', 'workshop', 'social', 'outreach', 'other']

  const handleSubmit = async () => {
    if (!form.title || !form.starts_at) {
      toast.error(t('requiredFields'))
      return
    }

    setLoading(true)
    try {
      const payload = {
        title: form.title,
        title_ar: form.title_ar || null,
        description: form.description || null,
        description_ar: form.description_ar || null,
        event_type: form.event_type,
        starts_at: form.starts_at,
        ends_at: form.ends_at || null,
        location: form.location || null,
        capacity: form.capacity ? Number(form.capacity) : null,
        is_public: form.is_public,
        registration_required: form.registration_required,
        registration_closes_at: form.registration_closes_at || null,
        visibility: audience.visibility,
        hide_from_non_invited: audience.hide_from_non_invited,
        visibility_targets: audience.visibility === 'restricted'
          ? [
              ...audience.ministry_ids.map(id => ({ target_type: 'ministry', target_id: id })),
              ...audience.group_ids.map(id => ({ target_type: 'group', target_id: id })),
            ]
          : [],
      }

      const url = event ? `/api/events/${event.id}` : '/api/events'
      const method = event ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.error || 'Failed')
      }

      // Get the event ID — for new events, parse from response; for edits, use the prop
      let eventId = event?.id
      if (!eventId) {
        const eventData = await res.json()
        eventId = eventData.data?.id
      }

      // Save service needs (don't block the event save on failure)
      if (eventId) {
        try {
          await fetch(`/api/events/${eventId}/service-needs`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              needs: serviceNeeds.map(n => ({
                ministry_id: n.ministry_id || null,
                group_id: n.group_id || null,
                volunteers_needed: n.volunteers_needed,
                notes: n.notes || null,
                notes_ar: n.notes_ar || null,
              })),
            }),
          })
        } catch {
          // Service needs save failed — event itself is saved
        }
      }

      toast.success(event ? t('eventUpdated') : t('eventCreated'))
      router.push(event ? `/admin/events/${event.id}` : '/events')
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('errorGeneral'))
    } finally {
      setLoading(false)
    }
  }

  const canProceed =
    step === 0 ? !!form.title :
    step === 1 ? !!form.starts_at :
    true

  const totalVolunteers = serviceNeeds.reduce((sum, n) => sum + n.volunteers_needed, 0)

  return (
    <Stepper
      steps={STEPS}
      currentStep={step}
      onNext={() => setStep(s => Math.min(s + 1, STEPS.length - 1))}
      onBack={() => step === 0 ? router.back() : setStep(s => s - 1)}
      onSubmit={handleSubmit}
      isSubmitting={loading}
      submitLabel={event ? t('updateEvent') : t('createEvent')}
      submitLabelAr={event ? t('updateEvent') : t('createEvent')}
      canProceed={canProceed}
    >
      {/* Step 1: Title & Type */}
      {step === 0 && (
        <div className="space-y-5 pt-4">
          <div>
            <div className="flex items-center gap-3 text-zinc-500 mb-2">
              <Type className="h-5 w-5" />
              <span className="text-sm font-medium">{t('titleEn')} *</span>
            </div>
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              dir="ltr"
              className="text-lg min-h-[48px]"
            />
          </div>
          <div>
            <Label className="text-sm text-zinc-500 mb-1 block">{t('titleAr')}</Label>
            <Input
              value={form.title_ar}
              onChange={(e) => setForm({ ...form, title_ar: e.target.value })}
              dir="rtl"
              className="min-h-[48px]"
            />
          </div>
          <div>
            <Label className="text-sm text-zinc-500 mb-2 block">{t('eventType')}</Label>
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
                  <span className="text-xs">{t(`type_${type}`)}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Step 2: When */}
      {step === 1 && (
        <div className="space-y-5 pt-4">
          <div>
            <div className="flex items-center gap-3 text-zinc-500 mb-2">
              <Calendar className="h-5 w-5" />
              <span className="text-sm font-medium">{t('startsAt')} *</span>
            </div>
            <Input
              type="datetime-local"
              value={form.starts_at}
              onChange={(e) => setForm({ ...form, starts_at: e.target.value })}
              dir="ltr"
              className="text-lg min-h-[48px]"
            />
          </div>
          <div>
            <Label className="text-sm text-zinc-500 mb-1 block">{t('endsAt')}</Label>
            <Input
              type="datetime-local"
              value={form.ends_at}
              onChange={(e) => setForm({ ...form, ends_at: e.target.value })}
              dir="ltr"
              className="min-h-[48px]"
            />
          </div>
        </div>
      )}

      {/* Step 3: Where */}
      {step === 2 && (
        <div className="space-y-5 pt-4">
          <div>
            <div className="flex items-center gap-3 text-zinc-500 mb-2">
              <MapPin className="h-5 w-5" />
              <span className="text-sm font-medium">{t('location')}</span>
            </div>
            <Input
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              className="text-lg min-h-[48px]"
            />
          </div>
          <div>
            <Label className="text-sm text-zinc-500 mb-1 block">{t('capacity')}</Label>
            <Input
              type="number"
              placeholder={t('capacityPlaceholder')}
              value={form.capacity}
              onChange={(e) => setForm({ ...form, capacity: e.target.value })}
              dir="ltr"
              className="min-h-[48px]"
            />
          </div>
        </div>
      )}

      {/* Step 4: Details */}
      {step === 3 && (
        <div className="space-y-5 pt-4">
          <div>
            <div className="flex items-center gap-3 text-zinc-500 mb-2">
              <FileText className="h-5 w-5" />
              <span className="text-sm font-medium">{t('descriptionEn')}</span>
            </div>
            <Textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
              dir="ltr"
            />
          </div>
          <div>
            <Label className="text-sm text-zinc-500 mb-1 block">{t('descriptionAr')}</Label>
            <Textarea
              value={form.description_ar}
              onChange={(e) => setForm({ ...form, description_ar: e.target.value })}
              rows={3}
              dir="rtl"
            />
          </div>
          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-zinc-50">
              <Switch
                checked={form.is_public}
                onCheckedChange={(checked) => setForm({ ...form, is_public: checked })}
              />
              <Label>{t('isPublic')}</Label>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-zinc-50">
              <Switch
                checked={form.registration_required}
                onCheckedChange={(checked) => setForm({ ...form, registration_required: checked })}
              />
              <Label>{t('registrationRequired')}</Label>
            </div>
          </div>
        </div>
      )}

      {/* Step 5: Audience */}
      {step === 4 && (
        <div className="pt-4">
          <EventAudienceSelector value={audience} onChange={setAudience} />
        </div>
      )}

      {/* Step 6: Service Needs */}
      {step === 5 && (
        <ServiceNeedsPicker
          serviceNeeds={serviceNeeds}
          onChange={setServiceNeeds}
        />
      )}

      {/* Step 7: Review */}
      {step === 6 && (
        <div className="space-y-3 pt-4">
          <ReviewItem icon={<Type className="h-4 w-4" />} label={t('titleEn')} value={form.title} />
          {form.title_ar && <ReviewItem icon={<Type className="h-4 w-4" />} label={t('titleAr')} value={form.title_ar} />}
          <ReviewItem icon={<Settings className="h-4 w-4" />} label={t('eventType')} value={`${EVENT_TYPE_ICONS[form.event_type]} ${t(`type_${form.event_type}`)}`} />
          {form.starts_at && (
            <ReviewItem
              icon={<Calendar className="h-4 w-4" />}
              label={t('startsAt')}
              value={new Date(form.starts_at).toLocaleString(isRTL ? 'ar' : 'en', { dateStyle: 'medium', timeStyle: 'short' })}
            />
          )}
          {form.location && <ReviewItem icon={<MapPin className="h-4 w-4" />} label={t('location')} value={form.location} />}
          {form.capacity && <ReviewItem icon={<Settings className="h-4 w-4" />} label={t('capacity')} value={String(form.capacity)} />}
          {serviceNeeds.length > 0 && (
            <ReviewItem
              icon={<Users className="h-4 w-4" />}
              label={t('serviceNeeds')}
              value={t('serviceNeedsSummary', { count: String(serviceNeeds.length), total: String(totalVolunteers) })}
            />
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
