'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Receipt, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

const PAYMENT_METHODS = [
  { value: 'cash', en: 'Cash', ar: 'نقد' },
  { value: 'check', en: 'Check', ar: 'شيك' },
  { value: 'bank_transfer', en: 'Bank Transfer', ar: 'تحويل بنكي' },
  { value: 'other', en: 'Other', ar: 'أخرى' },
]

export default function NewExpensePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [ministries, setMinistries] = useState<Array<{ id: string; name: string; name_ar: string | null }>>([])
  const [funds, setFunds] = useState<Array<{ id: string; name: string; name_ar: string | null }>>([])
  const [form, setForm] = useState({
    description: '', description_ar: '', amount: '',
    currency: 'USD', vendor_name: '', vendor_name_ar: '',
    ministry_id: '', fund_id: '', notes: '',
    is_reimbursement: false, payment_method: 'cash',
  })

  useEffect(() => {
    Promise.all([
      fetch('/api/ministries').then(r => r.json()),
      fetch('/api/finance/funds').then(r => r.json()),
    ]).then(([m, f]) => {
      setMinistries(m.data || [])
      setFunds(f.data || [])
    })
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await fetch('/api/finance/expenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        amount: parseFloat(form.amount),
        ministry_id: form.ministry_id || null,
        fund_id: form.fund_id || null,
      }),
    })

    if (!res.ok) {
      const err = await res.json()
      setError(err.error || 'Failed to submit')
      setLoading(false)
      return
    }

    router.push('/admin/finance/expenses')
    router.refresh()
  }

  const set = (field: string, value: string | boolean) =>
    setForm(prev => ({ ...prev, [field]: value }))

  return (
    <div className="p-6 max-w-xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/finance/expenses"><ArrowLeft className="w-4 h-4" /></Link>
        </Button>
        <h1 className="text-xl font-bold">New Expense Request / طلب مصروف جديد</h1>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <Label>Description / الوصف *</Label>
              <Input
                required
                value={form.description}
                onChange={e => set('description', e.target.value)}
                placeholder="What is this expense for?"
              />
              <Input
                value={form.description_ar}
                onChange={e => set('description_ar', e.target.value)}
                placeholder="الوصف بالعربية"
                dir="rtl"
              />
            </div>

            <div className="space-y-1">
              <Label>Amount / المبلغ *</Label>
              <div className="flex gap-2">
                <Input
                  type="number" min="0" step="0.01" required
                  value={form.amount}
                  onChange={e => set('amount', e.target.value)}
                  placeholder="0.00"
                />
                <select
                  value={form.currency}
                  onChange={e => set('currency', e.target.value)}
                  className="text-sm border rounded px-2 py-2 bg-background w-24"
                >
                  {['USD', 'LBP', 'EGP', 'JOD', 'EUR'].map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <Label>Vendor / المورد</Label>
              <Input
                value={form.vendor_name}
                onChange={e => set('vendor_name', e.target.value)}
                placeholder="Vendor name"
              />
            </div>

            <div className="space-y-1">
              <Label>Ministry / الخدمة</Label>
              <select
                value={form.ministry_id}
                onChange={e => set('ministry_id', e.target.value)}
                className="w-full text-sm border rounded px-3 py-2 bg-background"
              >
                <option value="">Select ministry (optional)</option>
                {ministries.map(m => (
                  <option key={m.id} value={m.id}>{m.name} {m.name_ar ? `/ ${m.name_ar}` : ''}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <Label>Fund / الصندوق</Label>
              <select
                value={form.fund_id}
                onChange={e => set('fund_id', e.target.value)}
                className="w-full text-sm border rounded px-3 py-2 bg-background"
              >
                <option value="">Select fund (optional)</option>
                {funds.map(f => (
                  <option key={f.id} value={f.id}>{f.name} {f.name_ar ? `/ ${f.name_ar}` : ''}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <Label>Preferred Payment Method / طريقة الدفع المفضلة</Label>
              <select
                value={form.payment_method}
                onChange={e => set('payment_method', e.target.value)}
                className="w-full text-sm border rounded px-3 py-2 bg-background"
              >
                {PAYMENT_METHODS.map(m => (
                  <option key={m.value} value={m.value}>{m.en} / {m.ar}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="reimburse"
                checked={form.is_reimbursement}
                onCheckedChange={(v) => set('is_reimbursement', !!v)}
              />
              <Label htmlFor="reimburse">Reimbursement (already paid) / سداد تكاليف</Label>
            </div>

            <div className="space-y-1">
              <Label>Notes / ملاحظات</Label>
              <textarea
                value={form.notes}
                onChange={e => set('notes', e.target.value)}
                className="w-full text-sm border rounded px-3 py-2 bg-background min-h-[80px] resize-none"
                placeholder="Any additional details..."
              />
            </div>

            {error && <p className="text-red-600 text-sm">{error}</p>}

            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={loading} className="flex-1">
                <Receipt className="w-4 h-4 me-2" />
                {loading ? 'Submitting...' : 'Submit Request / تقديم الطلب'}
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href="/admin/finance/expenses">Cancel</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
