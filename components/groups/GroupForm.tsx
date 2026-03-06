'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Stepper } from '@/components/ui/stepper'
import { toast } from 'sonner'
import { useTranslations, useLocale } from 'next-intl'
import { Users, UserCheck, Calendar, Settings, Type, UserPlus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { RegisterLeaderDialog } from './RegisterLeaderDialog'

type Ministry = { id: string; name: string; name_ar: string | null }
type Leader = { id: string; first_name: string | null; last_name: string | null; first_name_ar: string | null; last_name_ar: string | null }

const GROUP_TYPE_KEYS = [
  { value: 'small_group', key: 'typeSmallGroup', icon: '👥' },
  { value: 'youth', key: 'typeYouth', icon: '🧑‍🤝‍🧑' },
  { value: 'women', key: 'typeWomen', icon: '👩' },
  { value: 'men', key: 'typeMen', icon: '👨' },
  { value: 'family', key: 'typeFamily', icon: '👨‍👩‍👧' },
  { value: 'prayer', key: 'typePrayer', icon: '🙏' },
  { value: 'other', key: 'typeOther', icon: '📌' },
]

const FREQUENCY_KEYS = [
  { value: 'weekly', key: 'frequencyWeekly' },
  { value: 'biweekly', key: 'frequencyBiweekly' },
  { value: 'monthly', key: 'frequencyMonthly' },
  { value: 'irregular', key: 'frequencyIrregular' },
]

const DAY_KEYS = [
  { value: 'monday', key: 'dayMonday' },
  { value: 'tuesday', key: 'dayTuesday' },
  { value: 'wednesday', key: 'dayWednesday' },
  { value: 'thursday', key: 'dayThursday' },
  { value: 'friday', key: 'dayFriday' },
  { value: 'saturday', key: 'daySaturday' },
  { value: 'sunday', key: 'daySunday' },
]

const STEPS = [
  { title: 'Name & Type', titleAr: 'الاسم والنوع' },
  { title: 'Leadership', titleAr: 'القيادة' },
  { title: 'Meeting Details', titleAr: 'تفاصيل الاجتماع' },
  { title: 'Review', titleAr: 'مراجعة' },
]

type Props = {
  ministries: Ministry[]
  leaders: Leader[]
  group?: {
    id: string
    name: string
    name_ar?: string
    type: string
    ministry_id?: string
    leader_id?: string
    co_leader_id?: string
    meeting_day?: string
    meeting_time?: string
    meeting_location?: string
    meeting_location_ar?: string
    meeting_frequency?: string
    max_members?: string
    is_open: boolean
  }
}

export function GroupForm({ ministries, leaders, group }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState(0)
  const [localLeaders, setLocalLeaders] = useState<Leader[]>(leaders)
  const [registerDialogOpen, setRegisterDialogOpen] = useState(false)
  const t = useTranslations('groupForm')
  const tGroups = useTranslations('groups')
  const locale = useLocale()
  const isRTL = locale === 'ar'

  const [form, setForm] = useState({
    name: group?.name || '',
    name_ar: group?.name_ar || '',
    type: group?.type || 'small_group',
    ministry_id: group?.ministry_id || '',
    leader_id: group?.leader_id || '',
    co_leader_id: group?.co_leader_id || '',
    meeting_day: group?.meeting_day || '',
    meeting_time: group?.meeting_time || '',
    meeting_location: group?.meeting_location || '',
    meeting_location_ar: group?.meeting_location_ar || '',
    meeting_frequency: group?.meeting_frequency || 'weekly',
    max_members: group?.max_members || '',
    is_open: group?.is_open ?? true,
  })

  function set(key: string, val: string | boolean) {
    setForm(prev => ({ ...prev, [key]: val }))
  }

  async function handleSubmit() {
    if (!form.name) {
      toast.error(t('toastError'))
      return
    }

    setLoading(true)
    try {
      const body = {
        name: form.name,
        name_ar: form.name_ar || null,
        type: form.type,
        ministry_id: form.ministry_id || null,
        leader_id: form.leader_id || null,
        co_leader_id: form.co_leader_id || null,
        meeting_day: form.meeting_day || null,
        meeting_time: form.meeting_time || null,
        meeting_location: form.meeting_location || null,
        meeting_location_ar: form.meeting_location_ar || null,
        meeting_frequency: form.meeting_frequency || 'weekly',
        max_members: form.max_members ? parseInt(form.max_members as string) : null,
        is_open: form.is_open,
      }

      const url = group ? `/api/groups/${group.id}` : '/api/groups'
      const method = group ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error()

      toast.success(group ? t('toastUpdated') : t('toastCreated'))
      router.push('/admin/groups')
      router.refresh()
    } catch {
      toast.error(t('toastError'))
    } finally {
      setLoading(false)
    }
  }

  function handleLeaderCreated(newLeader: Leader) {
    setLocalLeaders(prev => [...prev, newLeader])
    set('leader_id', newLeader.id)
  }

  const leaderName = (id: string) => {
    const l = localLeaders.find(l => l.id === id)
    if (!l) return ''
    return `${l.first_name_ar || l.first_name || ''} ${l.last_name_ar || l.last_name || ''}`.trim()
  }

  const canProceed = step === 0 ? !!form.name : true

  return (
    <Stepper
      steps={STEPS}
      currentStep={step}
      onNext={() => setStep(s => Math.min(s + 1, STEPS.length - 1))}
      onBack={() => step === 0 ? router.back() : setStep(s => s - 1)}
      onSubmit={handleSubmit}
      isSubmitting={loading}
      submitLabel={group ? t('saveButton') : t('saveButton')}
      submitLabelAr={group ? t('saveButton') : t('saveButton')}
      canProceed={canProceed}
    >
      {/* Step 1: Name & Type */}
      {step === 0 && (
        <div className="space-y-5 pt-4">
          <div>
            <div className="flex items-center gap-3 text-zinc-500 mb-2">
              <Type className="h-5 w-5" />
              <span className="text-sm font-medium">{t('nameEn')} *</span>
            </div>
            <Input
              value={form.name}
              onChange={e => set('name', e.target.value)}
              dir="ltr"
              placeholder={t('nameEnPlaceholder')}
              className="text-lg min-h-[48px]"
            />
          </div>
          <div>
            <Label className="text-sm text-zinc-500 mb-1 block">{t('nameAr')}</Label>
            <Input
              value={form.name_ar}
              onChange={e => set('name_ar', e.target.value)}
              placeholder={t('nameArPlaceholder')}
              className="min-h-[48px]"
            />
          </div>
          <div>
            <Label className="text-sm text-zinc-500 mb-2 block">{t('type')}</Label>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {GROUP_TYPE_KEYS.map(gt => (
                <button
                  key={gt.value}
                  type="button"
                  onClick={() => set('type', gt.value)}
                  className={cn(
                    'flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all',
                    form.type === gt.value
                      ? 'border-primary bg-primary/5 font-medium'
                      : 'border-zinc-100 hover:border-zinc-200'
                  )}
                >
                  <span className="text-xl">{gt.icon}</span>
                  <span className="text-xs">{tGroups(gt.key)}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Leadership */}
      {step === 1 && (
        <div className="space-y-5 pt-4">
          <div>
            <div className="flex items-center gap-3 text-zinc-500 mb-2">
              <UserCheck className="h-5 w-5" />
              <span className="text-sm font-medium">{t('leader')}</span>
            </div>
            {localLeaders.length > 0 ? (
              <Select value={form.leader_id} onValueChange={v => set('leader_id', v)}>
                <SelectTrigger className="min-h-[48px]"><SelectValue placeholder={t('leaderPlaceholder')} /></SelectTrigger>
                <SelectContent>
                  {localLeaders.map(l => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.first_name_ar || l.first_name} {l.last_name_ar || l.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <p className="text-sm text-zinc-400 p-3 rounded-lg bg-zinc-50 border border-zinc-100">
                {t('noLeadersHint')}
              </p>
            )}
            <button
              type="button"
              onClick={() => setRegisterDialogOpen(true)}
              className="flex items-center gap-2 text-sm text-primary hover:underline mt-2"
            >
              <UserPlus className="h-4 w-4" />
              {t('registerNewLeader')}
            </button>
          </div>
          <div>
            <Label className="text-sm text-zinc-500 mb-1 block">{t('coLeader')}</Label>
            <Select value={form.co_leader_id} onValueChange={v => set('co_leader_id', v)}>
              <SelectTrigger className="min-h-[48px]"><SelectValue placeholder={t('coLeaderPlaceholder')} /></SelectTrigger>
              <SelectContent>
                {localLeaders.map(l => (
                  <SelectItem key={l.id} value={l.id}>
                    {l.first_name_ar || l.first_name} {l.last_name_ar || l.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-sm text-zinc-500 mb-1 block">{t('ministry')}</Label>
            <Select value={form.ministry_id} onValueChange={v => set('ministry_id', v)}>
              <SelectTrigger className="min-h-[48px]"><SelectValue placeholder={t('ministryPlaceholder')} /></SelectTrigger>
              <SelectContent>
                {ministries.map(m => <SelectItem key={m.id} value={m.id}>{m.name_ar || m.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <RegisterLeaderDialog
            open={registerDialogOpen}
            onOpenChange={setRegisterDialogOpen}
            onLeaderCreated={handleLeaderCreated}
          />
        </div>
      )}

      {/* Step 3: Meeting Details */}
      {step === 2 && (
        <div className="space-y-5 pt-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="flex items-center gap-2 text-zinc-500 mb-2">
                <Calendar className="h-4 w-4" />
                <span className="text-sm font-medium">{t('meetingDay')}</span>
              </div>
              <Select value={form.meeting_day} onValueChange={v => set('meeting_day', v)}>
                <SelectTrigger className="min-h-[48px]"><SelectValue placeholder={t('meetingDayPlaceholder')} /></SelectTrigger>
                <SelectContent>
                  {DAY_KEYS.map(d => <SelectItem key={d.value} value={d.value}>{tGroups(d.key)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm text-zinc-500 mb-2 block">{t('meetingTime')}</Label>
              <Input
                type="time"
                value={form.meeting_time}
                onChange={e => set('meeting_time', e.target.value)}
                dir="ltr"
                className="min-h-[48px]"
              />
            </div>
          </div>
          <div>
            <Label className="text-sm text-zinc-500 mb-1 block">{t('frequency')}</Label>
            <Select value={form.meeting_frequency} onValueChange={v => set('meeting_frequency', v)}>
              <SelectTrigger className="min-h-[48px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {FREQUENCY_KEYS.map(f => <SelectItem key={f.value} value={f.value}>{tGroups(f.key)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-sm text-zinc-500 mb-1 block">{t('meetingLocation')}</Label>
            <Input
              value={form.meeting_location}
              onChange={e => set('meeting_location', e.target.value)}
              placeholder={t('meetingLocationPlaceholder')}
              className="min-h-[48px]"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-sm text-zinc-500 mb-1 block">{t('maxMembers')}</Label>
              <Input
                type="number"
                value={form.max_members}
                onChange={e => set('max_members', e.target.value)}
                placeholder="12"
                dir="ltr"
                className="min-h-[48px]"
              />
            </div>
            <div className="flex items-center gap-3 pt-6 p-3 rounded-lg bg-zinc-50">
              <Switch checked={form.is_open} onCheckedChange={v => set('is_open', v)} />
              <Label className="text-sm">{t('openForJoining')}</Label>
            </div>
          </div>
        </div>
      )}

      {/* Step 4: Review */}
      {step === 3 && (
        <div className="space-y-3 pt-4">
          <ReviewItem icon={<Type className="h-4 w-4" />} label={t('nameEn')} value={form.name} />
          {form.name_ar && <ReviewItem icon={<Type className="h-4 w-4" />} label={t('nameAr')} value={form.name_ar} />}
          <ReviewItem
            icon={<Users className="h-4 w-4" />}
            label={t('type')}
            value={`${GROUP_TYPE_KEYS.find(g => g.value === form.type)?.icon || ''} ${tGroups(GROUP_TYPE_KEYS.find(g => g.value === form.type)?.key || 'typeOther')}`}
          />
          {form.leader_id && <ReviewItem icon={<UserCheck className="h-4 w-4" />} label={t('leader')} value={leaderName(form.leader_id)} />}
          {form.meeting_day && <ReviewItem icon={<Calendar className="h-4 w-4" />} label={t('meetingDay')} value={tGroups(DAY_KEYS.find(d => d.value === form.meeting_day)?.key || '')} />}
          {form.meeting_time && <ReviewItem icon={<Settings className="h-4 w-4" />} label={t('meetingTime')} value={form.meeting_time} />}
          <ReviewItem icon={<Settings className="h-4 w-4" />} label={t('admissionStatus')} value={form.is_open ? t('openForJoining') : '🔒'} />
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
