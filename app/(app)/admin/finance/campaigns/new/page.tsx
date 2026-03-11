'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Target, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function NewCampaignPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [funds, setFunds] = useState<Array<{ id: string; name: string; name_ar: string | null }>>([])
  const [form, setForm] = useState({
    name: '', name_ar: '', description: '', description_ar: '',
    goal_amount: '', currency: 'USD', fund_id: '',
    start_date: new Date().toISOString().split('T')[0], end_date: '',
    is_public: true, allow_pledges: true, allow_online: false,
    status: 'planning',
  })

  useEffect(() => {
    fetch('/api/finance/funds').then(r => r.json()).then(d => setFunds(d.data || []))
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await fetch('/api/finance/campaigns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        goal_amount: parseFloat(form.goal_amount),
        fund_id: form.fund_id || null,
        end_date: form.end_date || null,
      }),
    })

    if (!res.ok) {
      const err = await res.json()
      setError(err.error || 'Failed to create campaign')
      setLoading(false)
      return
    }

    router.push('/admin/finance/campaigns')
    router.refresh()
  }

  const set = (field: string, value: string | boolean) =>
    setForm(prev => ({ ...prev, [field]: value }))

  return (
    <div className="p-6 max-w-xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/finance/campaigns"><ArrowLeft className="w-4 h-4" /></Link>
        </Button>
        <h1 className="text-xl font-bold">New Campaign / حملة جديدة</h1>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Name (English) *</Label>
                <Input required value={form.name} onChange={e => set('name', e.target.value)} placeholder="Campaign name" />
              </div>
              <div className="space-y-1">
                <Label>الاسم بالعربية</Label>
                <Input value={form.name_ar} onChange={e => set('name_ar', e.target.value)} placeholder="اسم الحملة" dir="rtl" />
              </div>
            </div>

            <div className="space-y-1">
              <Label>Description</Label>
              <textarea value={form.description} onChange={e => set('description', e.target.value)} className="w-full text-sm border rounded px-3 py-2 bg-background min-h-[60px] resize-none" placeholder="Campaign description..." />
              <textarea value={form.description_ar} onChange={e => set('description_ar', e.target.value)} className="w-full text-sm border rounded px-3 py-2 bg-background min-h-[60px] resize-none mt-1" placeholder="الوصف بالعربية..." dir="rtl" />
            </div>

            <div className="space-y-1">
              <Label>Goal Amount / الهدف المالي *</Label>
              <div className="flex gap-2">
                <Input type="number" min="0" step="1" required value={form.goal_amount} onChange={e => set('goal_amount', e.target.value)} placeholder="0" />
                <select value={form.currency} onChange={e => set('currency', e.target.value)} className="text-sm border rounded px-2 bg-background w-24">
                  {['USD', 'LBP', 'EGP', 'JOD', 'EUR'].map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <Label>Fund / الصندوق</Label>
              <select value={form.fund_id} onChange={e => set('fund_id', e.target.value)} className="w-full text-sm border rounded px-3 py-2 bg-background">
                <option value="">No fund / بدون صندوق</option>
                {funds.map(f => <option key={f.id} value={f.id}>{f.name} {f.name_ar ? `/ ${f.name_ar}` : ''}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Start Date / تاريخ البداية *</Label>
                <Input type="date" required value={form.start_date} onChange={e => set('start_date', e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>End Date / تاريخ النهاية</Label>
                <Input type="date" value={form.end_date} onChange={e => set('end_date', e.target.value)} />
              </div>
            </div>

            <div className="space-y-1">
              <Label>Status / الحالة</Label>
              <select value={form.status} onChange={e => set('status', e.target.value)} className="w-full text-sm border rounded px-3 py-2 bg-background">
                <option value="planning">Planning / تخطيط</option>
                <option value="active">Active / نشط</option>
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Checkbox id="public" checked={form.is_public} onCheckedChange={(v) => set('is_public', !!v)} />
                <Label htmlFor="public">Visible to members / مرئي للأعضاء</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="pledges" checked={form.allow_pledges} onCheckedChange={(v) => set('allow_pledges', !!v)} />
                <Label htmlFor="pledges">Allow pledges / السماح بالوعود</Label>
              </div>
            </div>

            {error && <p className="text-red-600 text-sm">{error}</p>}

            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={loading} className="flex-1">
                <Target className="w-4 h-4 mr-2" />
                {loading ? 'Creating...' : 'Create Campaign / إنشاء الحملة'}
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href="/admin/finance/campaigns">Cancel</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
