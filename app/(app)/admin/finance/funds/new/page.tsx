'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { ArrowLeft, Wallet } from 'lucide-react'
import Link from 'next/link'

export default function NewFundPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    name: '', name_ar: '', description: '', description_ar: '',
    currency: 'USD', target_amount: '',
    fund_type: 'general',
    is_restricted: false, is_default: false, is_active: true,
  })

  const set = (field: string, value: string | boolean) => setForm(p => ({ ...p, [field]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError('')

    const res = await fetch('/api/finance/funds', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        target_amount: form.target_amount ? parseFloat(form.target_amount) : null,
      }),
    })

    if (!res.ok) {
      const err = await res.json()
      setError(err.error || 'Failed to create fund')
      setLoading(false)
      return
    }

    router.push('/admin/finance/funds')
    router.refresh()
  }

  return (
    <div className="p-6 max-w-xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/finance/funds"><ArrowLeft className="w-4 h-4" /></Link>
        </Button>
        <h1 className="text-xl font-bold">New Fund / صندوق جديد</h1>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Name (English) *</Label>
                <Input required value={form.name} onChange={e => set('name', e.target.value)} placeholder="General Fund" />
              </div>
              <div className="space-y-1">
                <Label>الاسم بالعربية</Label>
                <Input value={form.name_ar} onChange={e => set('name_ar', e.target.value)} placeholder="الصندوق العام" dir="rtl" />
              </div>
            </div>

            <div className="space-y-1">
              <Label>Fund Type / النوع</Label>
              <select value={form.fund_type} onChange={e => set('fund_type', e.target.value)}
                className="w-full text-sm border rounded px-3 py-2 bg-background">
                <option value="general">General / عام</option>
                <option value="building">Building / مبنى</option>
                <option value="missions">Missions / مهام</option>
                <option value="benevolence">Benevolence / رعاية</option>
                <option value="youth">Youth / شباب</option>
                <option value="children">Children / أطفال</option>
                <option value="other">Other / أخرى</option>
              </select>
            </div>

            <div className="space-y-1">
              <Label>Description</Label>
              <textarea value={form.description} onChange={e => set('description', e.target.value)}
                className="w-full text-sm border rounded px-3 py-2 bg-background min-h-[60px] resize-none"
                placeholder="Fund description..." />
              <textarea value={form.description_ar} onChange={e => set('description_ar', e.target.value)}
                className="w-full text-sm border rounded px-3 py-2 bg-background min-h-[60px] resize-none mt-1"
                placeholder="الوصف بالعربية..." dir="rtl" />
            </div>

            <div className="space-y-1">
              <Label>Target Amount / الهدف (optional)</Label>
              <div className="flex gap-2">
                <Input type="number" min="0" step="1" value={form.target_amount}
                  onChange={e => set('target_amount', e.target.value)} placeholder="0" />
                <select value={form.currency} onChange={e => set('currency', e.target.value)}
                  className="text-sm border rounded px-2 bg-background w-24">
                  {['USD', 'LBP', 'EGP', 'JOD', 'EUR'].map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Checkbox id="restricted" checked={form.is_restricted} onCheckedChange={v => set('is_restricted', !!v)} />
                <Label htmlFor="restricted">Restricted fund / صندوق مقيد</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="default" checked={form.is_default} onCheckedChange={v => set('is_default', !!v)} />
                <Label htmlFor="default">Set as default fund / صندوق افتراضي</Label>
              </div>
            </div>

            {error && <p className="text-red-600 text-sm">{error}</p>}

            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={loading} className="flex-1">
                <Wallet className="w-4 h-4 mr-2" />
                {loading ? 'Creating...' : 'Create Fund / إنشاء الصندوق'}
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href="/admin/finance/funds">Cancel</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
