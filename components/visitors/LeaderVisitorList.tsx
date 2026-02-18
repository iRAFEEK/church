'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { formatDistanceToNow } from '@/lib/utils'

type Visitor = {
  id: string
  first_name: string
  last_name: string
  phone: string | null
  email: string | null
  age_range: string | null
  occupation: string | null
  visited_at: string
  status: string
  contact_notes: string | null
  contacted_at: string | null
}

const STATUS_LABELS: Record<string, string> = {
  new: 'جديد',
  assigned: 'مُسنَد إليك',
  contacted: 'تم التواصل',
}

const AGE_AR: Record<string, string> = {
  under_18: 'أقل من 18',
  '18_25': '18–25',
  '26_35': '26–35',
  '36_45': '36–45',
  '46_55': '46–55',
  '56_plus': '56+',
}

export function LeaderVisitorList({ visitors, slaHours }: { visitors: Visitor[]; slaHours: number }) {
  const [localVisitors, setLocalVisitors] = useState(visitors)
  const [selected, setSelected] = useState<Visitor | null>(null)
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)

  const slaMs = slaHours * 60 * 60 * 1000
  const now = Date.now()

  function isOverdue(v: Visitor) {
    return ['new', 'assigned'].includes(v.status) && now - new Date(v.visited_at).getTime() > slaMs
  }

  async function markContacted() {
    if (!selected) return
    setLoading(true)
    try {
      const res = await fetch(`/api/visitors/${selected.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'contact', contact_notes: notes }),
      })
      if (!res.ok) throw new Error()
      const { data } = await res.json()
      setLocalVisitors(prev => prev.map(v => v.id === selected.id ? { ...v, ...data } : v))
      toast.success('تم تسجيل التواصل')
      setSelected(null)
    } catch {
      toast.error('حدث خطأ')
    } finally {
      setLoading(false)
    }
  }

  if (localVisitors.length === 0) {
    return (
      <div className="text-center py-16 text-zinc-400">
        <p className="text-lg font-medium mb-1">لا يوجد زوار مُسنَدون إليك</p>
        <p className="text-sm">سيظهر الزوار هنا عند إسنادهم إليك</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {localVisitors.map(v => (
        <div
          key={v.id}
          className={`rounded-xl border p-4 transition-colors ${
            isOverdue(v) ? 'border-red-200 bg-red-50' : 'border-zinc-200 bg-white'
          }`}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="font-semibold text-zinc-900">{v.first_name} {v.last_name}</span>
                {isOverdue(v) && (
                  <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">
                    متأخر عن SLA
                  </span>
                )}
                {v.status === 'contacted' && (
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                    تم التواصل
                  </span>
                )}
              </div>

              <div className="text-sm text-zinc-500 space-y-0.5">
                {v.phone && <p>📞 {v.phone}</p>}
                {v.email && <p>✉️ {v.email}</p>}
                {v.occupation && <p>💼 {v.occupation}</p>}
                {v.age_range && <p>🎂 {AGE_AR[v.age_range] || v.age_range}</p>}
                <p className="text-xs text-zinc-400 mt-1">زار {formatDistanceToNow(v.visited_at)}</p>
              </div>

              {v.contact_notes && (
                <div className="mt-2 p-2 bg-zinc-50 rounded-lg text-xs text-zinc-600">
                  {v.contact_notes}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2 shrink-0">
              {v.phone && (
                <a
                  href={`tel:${v.phone}`}
                  className="text-sm text-blue-600 border border-blue-200 rounded-lg px-3 py-1.5 hover:bg-blue-50 transition-colors text-center"
                >
                  اتصال
                </a>
              )}
              {v.status !== 'contacted' && (
                <Button
                  size="sm"
                  onClick={() => { setSelected(v); setNotes(v.contact_notes || '') }}
                >
                  تسجيل تواصل
                </Button>
              )}
            </div>
          </div>
        </div>
      ))}

      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تسجيل التواصل مع الزائر</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <p className="text-sm text-zinc-600">
                {selected.first_name} {selected.last_name}
              </p>
              <Textarea
                placeholder="ملاحظات عن التواصل..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={4}
              />
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setSelected(null)}>إلغاء</Button>
                <Button onClick={markContacted} disabled={loading}>
                  {loading ? 'جارٍ الحفظ...' : 'تسجيل التواصل'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
