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

type Ministry = { id: string; name: string; name_ar: string | null }
type Leader = { id: string; first_name: string | null; last_name: string | null; first_name_ar: string | null; last_name_ar: string | null }

const schema = z.object({
  name: z.string().min(1, 'الاسم مطلوب'),
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

const GROUP_TYPES = [
  { value: 'small_group', label: 'مجموعة صغيرة' },
  { value: 'youth', label: 'شباب' },
  { value: 'women', label: 'نساء' },
  { value: 'men', label: 'رجال' },
  { value: 'family', label: 'عائلات' },
  { value: 'prayer', label: 'صلاة' },
  { value: 'other', label: 'أخرى' },
]

const FREQUENCIES = [
  { value: 'weekly', label: 'أسبوعي' },
  { value: 'biweekly', label: 'كل أسبوعين' },
  { value: 'monthly', label: 'شهري' },
  { value: 'irregular', label: 'غير منتظم' },
]

const DAYS = [
  { value: 'monday', label: 'الاثنين' },
  { value: 'tuesday', label: 'الثلاثاء' },
  { value: 'wednesday', label: 'الأربعاء' },
  { value: 'thursday', label: 'الخميس' },
  { value: 'friday', label: 'الجمعة' },
  { value: 'saturday', label: 'السبت' },
  { value: 'sunday', label: 'الأحد' },
]

type Props = {
  ministries: Ministry[]
  leaders: Leader[]
  group?: FormValues & { id: string }
}

export function GroupForm({ ministries, leaders, group }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

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

      toast.success(group ? 'تم تحديث المجموعة' : 'تم إنشاء المجموعة')
      router.push('/admin/groups')
      router.refresh()
    } catch {
      toast.error('حدث خطأ')
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
              <FormLabel>الاسم (إنجليزي) *</FormLabel>
              <FormControl><Input dir="ltr" placeholder="Youth Group" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="name_ar" render={({ field }) => (
            <FormItem>
              <FormLabel>الاسم (عربي)</FormLabel>
              <FormControl><Input placeholder="مجموعة الشباب" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        <FormField control={form.control} name="type" render={({ field }) => (
          <FormItem>
            <FormLabel>النوع</FormLabel>
            <Select onValueChange={field.onChange} value={field.value}>
              <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
              <SelectContent>
                {GROUP_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </FormItem>
        )} />

        <FormField control={form.control} name="ministry_id" render={({ field }) => (
          <FormItem>
            <FormLabel>الخدمة</FormLabel>
            <Select onValueChange={field.onChange} value={field.value}>
              <FormControl><SelectTrigger><SelectValue placeholder="اختر خدمة" /></SelectTrigger></FormControl>
              <SelectContent>
                {ministries.map(m => <SelectItem key={m.id} value={m.id}>{m.name_ar || m.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </FormItem>
        )} />

        <div className="grid grid-cols-2 gap-4">
          <FormField control={form.control} name="leader_id" render={({ field }) => (
            <FormItem>
              <FormLabel>القائد</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl><SelectTrigger><SelectValue placeholder="اختر قائداً" /></SelectTrigger></FormControl>
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
              <FormLabel>مساعد القائد</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl><SelectTrigger><SelectValue placeholder="اختياري" /></SelectTrigger></FormControl>
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
              <FormLabel>يوم الاجتماع</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl><SelectTrigger><SelectValue placeholder="اختر اليوم" /></SelectTrigger></FormControl>
                <SelectContent>
                  {DAYS.map(d => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </FormItem>
          )} />
          <FormField control={form.control} name="meeting_time" render={({ field }) => (
            <FormItem>
              <FormLabel>وقت الاجتماع</FormLabel>
              <FormControl><Input type="time" dir="ltr" {...field} /></FormControl>
            </FormItem>
          )} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField control={form.control} name="meeting_location" render={({ field }) => (
            <FormItem>
              <FormLabel>مكان الاجتماع</FormLabel>
              <FormControl><Input placeholder="القاعة الرئيسية" {...field} /></FormControl>
            </FormItem>
          )} />
          <FormField control={form.control} name="meeting_frequency" render={({ field }) => (
            <FormItem>
              <FormLabel>التكرار</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                <SelectContent>
                  {FREQUENCIES.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </FormItem>
          )} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField control={form.control} name="max_members" render={({ field }) => (
            <FormItem>
              <FormLabel>الحد الأقصى للأعضاء</FormLabel>
              <FormControl><Input type="number" placeholder="12" dir="ltr" {...field} /></FormControl>
            </FormItem>
          )} />
          <FormField control={form.control} name="is_open" render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>حالة القبول</FormLabel>
              <div className="flex items-center gap-2 mt-2">
                <input
                  type="checkbox"
                  id="is_open"
                  checked={field.value}
                  onChange={e => field.onChange(e.target.checked)}
                  className="w-4 h-4"
                />
                <label htmlFor="is_open" className="text-sm">مفتوحة للانضمام</label>
              </div>
            </FormItem>
          )} />
        </div>

        <div className="flex gap-2 justify-end pt-2">
          <Button type="button" variant="outline" onClick={() => router.back()}>إلغاء</Button>
          <Button type="submit" disabled={loading}>{loading ? 'جارٍ الحفظ...' : 'حفظ المجموعة'}</Button>
        </div>
      </form>
    </Form>
  )
}
