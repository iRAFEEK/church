'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { useTranslations } from 'next-intl'

type Ministry = { id: string; name: string; name_ar: string | null }
type Leader = { id: string; first_name: string | null; last_name: string | null; first_name_ar: string | null; last_name_ar: string | null }

const GROUP_TYPE_KEYS = [
  { value: 'small_group', key: 'typeSmallGroup' },
  { value: 'youth', key: 'typeYouth' },
  { value: 'women', key: 'typeWomen' },
  { value: 'men', key: 'typeMen' },
  { value: 'family', key: 'typeFamily' },
  { value: 'prayer', key: 'typePrayer' },
  { value: 'other', key: 'typeOther' },
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

type Props = {
  ministries: Ministry[]
  leaders: Leader[]
  group?: z.infer<typeof schema> & { id: string }
}

const schema = z.object({
  name: z.string().min(1, 'validationName'),
  name_ar: z.string().optional(),
  type: z.string().min(1),
  ministry_id: z.string().optional(),
  leader_id: z.string().optional(),
  co_leader_id: z.string().optional(),
  meeting_day: z.string().optional(),
  meeting_time: z.string().optional(),
  meeting_location: z.string().optional(),
  meeting_location_ar: z.string().optional(),
  meeting_frequency: z.string().optional(),
  max_members: z.string().optional(),
  is_open: z.boolean().default(true),
})

type FormValues = z.infer<typeof schema>

export function GroupForm({ ministries, leaders, group }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const t = useTranslations('groupForm')
  const tGroups = useTranslations('groups')

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: group || {
      name: '',
      name_ar: '',
      type: 'small_group',
      ministry_id: '',
      leader_id: '',
      co_leader_id: '',
      meeting_day: '',
      meeting_time: '',
      meeting_location: '',
      meeting_location_ar: '',
      meeting_frequency: 'weekly',
      max_members: '',
      is_open: true,
    },
  })

  async function onSubmit(values: FormValues) {
    setLoading(true)
    try {
      const body = {
        name: values.name,
        name_ar: values.name_ar || null,
        type: values.type,
        ministry_id: values.ministry_id || null,
        leader_id: values.leader_id || null,
        co_leader_id: values.co_leader_id || null,
        meeting_day: values.meeting_day || null,
        meeting_time: values.meeting_time || null,
        meeting_location: values.meeting_location || null,
        meeting_location_ar: values.meeting_location_ar || null,
        meeting_frequency: values.meeting_frequency || 'weekly',
        max_members: values.max_members ? parseInt(values.max_members) : null,
        is_open: values.is_open,
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

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 bg-white rounded-xl border border-zinc-200 p-6">
        <div className="grid grid-cols-2 gap-4">
          <FormField control={form.control} name="name" render={({ field }) => (
            <FormItem>
              <FormLabel>{t('nameEn')}</FormLabel>
              <FormControl><Input dir="ltr" placeholder={t('nameEnPlaceholder')} {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="name_ar" render={({ field }) => (
            <FormItem>
              <FormLabel>{t('nameAr')}</FormLabel>
              <FormControl><Input placeholder={t('nameArPlaceholder')} {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        <FormField control={form.control} name="type" render={({ field }) => (
          <FormItem>
            <FormLabel>{t('type')}</FormLabel>
            <Select onValueChange={field.onChange} value={field.value}>
              <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
              <SelectContent>
                {GROUP_TYPE_KEYS.map(gt => <SelectItem key={gt.value} value={gt.value}>{tGroups(gt.key)}</SelectItem>)}
              </SelectContent>
            </Select>
          </FormItem>
        )} />

        <FormField control={form.control} name="ministry_id" render={({ field }) => (
          <FormItem>
            <FormLabel>{t('ministry')}</FormLabel>
            <Select onValueChange={field.onChange} value={field.value}>
              <FormControl><SelectTrigger><SelectValue placeholder={t('ministryPlaceholder')} /></SelectTrigger></FormControl>
              <SelectContent>
                {ministries.map(m => <SelectItem key={m.id} value={m.id}>{m.name_ar || m.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </FormItem>
        )} />

        <div className="grid grid-cols-2 gap-4">
          <FormField control={form.control} name="leader_id" render={({ field }) => (
            <FormItem>
              <FormLabel>{t('leader')}</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl><SelectTrigger><SelectValue placeholder={t('leaderPlaceholder')} /></SelectTrigger></FormControl>
                <SelectContent>
                  {leaders.map(l => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.first_name_ar || l.first_name} {l.last_name_ar || l.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormItem>
          )} />
          <FormField control={form.control} name="co_leader_id" render={({ field }) => (
            <FormItem>
              <FormLabel>{t('coLeader')}</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl><SelectTrigger><SelectValue placeholder={t('coLeaderPlaceholder')} /></SelectTrigger></FormControl>
                <SelectContent>
                  {leaders.map(l => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.first_name_ar || l.first_name} {l.last_name_ar || l.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormItem>
          )} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField control={form.control} name="meeting_day" render={({ field }) => (
            <FormItem>
              <FormLabel>{t('meetingDay')}</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl><SelectTrigger><SelectValue placeholder={t('meetingDayPlaceholder')} /></SelectTrigger></FormControl>
                <SelectContent>
                  {DAY_KEYS.map(d => <SelectItem key={d.value} value={d.value}>{tGroups(d.key)}</SelectItem>)}
                </SelectContent>
              </Select>
            </FormItem>
          )} />
          <FormField control={form.control} name="meeting_time" render={({ field }) => (
            <FormItem>
              <FormLabel>{t('meetingTime')}</FormLabel>
              <FormControl><Input type="time" dir="ltr" {...field} /></FormControl>
            </FormItem>
          )} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField control={form.control} name="meeting_location" render={({ field }) => (
            <FormItem>
              <FormLabel>{t('meetingLocation')}</FormLabel>
              <FormControl><Input placeholder={t('meetingLocationPlaceholder')} {...field} /></FormControl>
            </FormItem>
          )} />
          <FormField control={form.control} name="meeting_frequency" render={({ field }) => (
            <FormItem>
              <FormLabel>{t('frequency')}</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                <SelectContent>
                  {FREQUENCY_KEYS.map(f => <SelectItem key={f.value} value={f.value}>{tGroups(f.key)}</SelectItem>)}
                </SelectContent>
              </Select>
            </FormItem>
          )} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField control={form.control} name="max_members" render={({ field }) => (
            <FormItem>
              <FormLabel>{t('maxMembers')}</FormLabel>
              <FormControl><Input type="number" placeholder="12" dir="ltr" {...field} /></FormControl>
            </FormItem>
          )} />
          <FormField control={form.control} name="is_open" render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>{t('admissionStatus')}</FormLabel>
              <div className="flex items-center gap-2 mt-2">
                <input
                  type="checkbox"
                  id="is_open"
                  checked={field.value}
                  onChange={e => field.onChange(e.target.checked)}
                  className="w-4 h-4"
                />
                <label htmlFor="is_open" className="text-sm">{t('openForJoining')}</label>
              </div>
            </FormItem>
          )} />
        </div>

        <div className="flex gap-2 justify-end pt-2">
          <Button type="button" variant="outline" onClick={() => router.back()}>{t('cancelButton')}</Button>
          <Button type="submit" disabled={loading}>{loading ? t('saving') : t('saveButton')}</Button>
        </div>
      </form>
    </Form>
  )
}
