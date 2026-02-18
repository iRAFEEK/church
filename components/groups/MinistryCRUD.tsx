'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

type Leader = {
  id: string
  first_name: string | null
  last_name: string | null
  first_name_ar: string | null
  last_name_ar: string | null
}

type Ministry = {
  id: string
  name: string
  name_ar: string | null
  leader_id: string | null
  description: string | null
  is_active: boolean
  leader?: Leader | null
}

const schema = z.object({
  name: z.string().min(1, 'الاسم مطلوب'),
  name_ar: z.string().optional(),
  description: z.string().optional(),
  leader_id: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

export function MinistryCRUD({ ministries: initial, leaders }: { ministries: Ministry[]; leaders: Leader[] }) {
  const router = useRouter()
  const [ministries, setMinistries] = useState(initial)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Ministry | null>(null)
  const [loading, setLoading] = useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', name_ar: '', description: '', leader_id: '' },
  })

  function openCreate() {
    setEditing(null)
    form.reset({ name: '', name_ar: '', description: '', leader_id: '' })
    setOpen(true)
  }

  function openEdit(m: Ministry) {
    setEditing(m)
    form.reset({
      name: m.name,
      name_ar: m.name_ar || '',
      description: m.description || '',
      leader_id: m.leader_id || '',
    })
    setOpen(true)
  }

  async function onSubmit(values: FormValues) {
    setLoading(true)
    try {
      const body = {
        name: values.name,
        name_ar: values.name_ar || null,
        description: values.description || null,
        leader_id: values.leader_id || null,
      }

      if (editing) {
        const res = await fetch(`/api/ministries/${editing.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        if (!res.ok) throw new Error()
        const { data } = await res.json()
        const leader = leaders.find(l => l.id === data.leader_id) || null
        setMinistries(prev => prev.map(m => m.id === editing.id ? { ...data, leader } : m))
        toast.success('تم تحديث الخدمة')
      } else {
        const res = await fetch('/api/ministries', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        if (!res.ok) throw new Error()
        const { data } = await res.json()
        const leader = leaders.find(l => l.id === data.leader_id) || null
        setMinistries(prev => [...prev, { ...data, leader }])
        toast.success('تم إنشاء الخدمة')
      }
      setOpen(false)
    } catch {
      toast.error('حدث خطأ')
    } finally {
      setLoading(false)
    }
  }

  async function toggleActive(m: Ministry) {
    const res = await fetch(`/api/ministries/${m.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !m.is_active }),
    })
    if (!res.ok) return toast.error('حدث خطأ')
    const { data } = await res.json()
    setMinistries(prev => prev.map(x => x.id === m.id ? { ...x, is_active: data.is_active } : x))
    toast.success(data.is_active ? 'تم تفعيل الخدمة' : 'تم إيقاف الخدمة')
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Button onClick={openCreate}>إضافة خدمة</Button>
      </div>

      {ministries.length === 0 ? (
        <div className="text-center py-16 text-zinc-400">
          <p className="font-medium">لا توجد خدمات بعد</p>
          <p className="text-sm mt-1">أضف أول خدمة لتنظيم مجموعاتك</p>
        </div>
      ) : (
        <div className="rounded-xl border border-zinc-200 divide-y divide-zinc-100">
          {ministries.map(m => (
            <div key={m.id} className="flex items-center gap-4 px-4 py-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-zinc-900">{m.name_ar || m.name}</span>
                  {!m.is_active && (
                    <span className="text-xs bg-zinc-100 text-zinc-500 px-2 py-0.5 rounded-full">غير نشط</span>
                  )}
                </div>
                {m.name_ar && <p className="text-xs text-zinc-400">{m.name}</p>}
                {m.leader && (
                  <p className="text-xs text-zinc-500 mt-0.5">
                    القائد: {m.leader.first_name_ar || m.leader.first_name} {m.leader.last_name_ar || m.leader.last_name}
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => openEdit(m)}>تعديل</Button>
                <Button size="sm" variant="outline" onClick={() => toggleActive(m)}>
                  {m.is_active ? 'إيقاف' : 'تفعيل'}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'تعديل الخدمة' : 'إضافة خدمة جديدة'}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>الاسم (إنجليزي)</FormLabel>
                  <FormControl><Input placeholder="Youth Ministry" dir="ltr" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="name_ar" render={({ field }) => (
                <FormItem>
                  <FormLabel>الاسم (عربي)</FormLabel>
                  <FormControl><Input placeholder="خدمة الشباب" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem>
                  <FormLabel>الوصف</FormLabel>
                  <FormControl><Textarea rows={3} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="leader_id" render={({ field }) => (
                <FormItem>
                  <FormLabel>القائد المسؤول</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger><SelectValue placeholder="اختر قائداً" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {leaders.map(l => (
                        <SelectItem key={l.id} value={l.id}>
                          {l.first_name_ar || l.first_name} {l.last_name_ar || l.last_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>إلغاء</Button>
                <Button type="submit" disabled={loading}>{loading ? 'جارٍ الحفظ...' : 'حفظ'}</Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
