'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { ArrowLeft, BarChart3 } from 'lucide-react'
import Link from 'next/link'

export default function NewBudgetPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [funds, setFunds] = useState<Array<{ id: string; name: string }>>([])
  const [fiscalYears, setFiscalYears] = useState<Array<{ id: string; name: string; year: number }>>([])
  const [form, setForm] = useState({
    name: '', name_ar: '', description: '',
    currency: 'USD', total_amount: '',
    period_type: 'annual', fund_id: '', fiscal_year_id: '',
    start_date: new Date().toISOString().split('T')[0], end_date: '',
  })

  useEffect(() => {
    fetch('/api/finance/funds').then(r => r.json()).then(d => setFunds(d.data || []))
    fetch('/api/finance/fiscal-years').then(r => r.json()).then(d => setFiscalYears(d.data || []))
  }, [])

  const set = (field: string, value: string) => setForm(p => ({ ...p, [field]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError('')

    const res = await fetch('/api/finance/budgets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        total_amount: parseFloat(form.total_amount),
        fund_id: form.fund_id || null,
        fiscal_year_id: form.fiscal_year_id || null,
        end_date: form.end_date || null,
      }),
    })

    if (!res.ok) {
      const err = await res.json()
      setError(err.error || 'Failed to create budget')
      setLoading(false)
      return
    }

    router.push('/admin/finance/budgets')
    router.refresh()
  }

  return (
    <div className="p-6 max-w-xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/finance/budgets"><ArrowLeft className="w-4 h-4" /></Link>
        </Button>
        <h1 className="text-xl font-bold">New Budget / ميزانية جديدة</h1>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Name (English) *</Label>
                <Input required value={form.name} onChange={e => set('name', e.target.value)} placeholder="Budget name" />
              </div>
              <div className="space-y-1">
                <Label>الاسم بالعربية</Label>
                <Input value={form.name_ar} onChange={e => set('name_ar', e.target.value)} placeholder="اسم الميزانية" dir="rtl" />
              </div>
            </div>

            <div className="space-y-1">
              <Label>Total Amount / المبلغ الإجمالي *</Label>
              <div className="flex gap-2">
                <Input type="number" min="0" step="1" required value={form.total_amount}
                  onChange={e => set('total_amount', e.target.value)} placeholder="0" />
                <select value={form.currency} onChange={e => set('currency', e.target.value)}
                  className="text-sm border rounded px-2 bg-background w-24">
                  {['USD', 'LBP', 'EGP', 'JOD', 'EUR'].map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Period Type / النوع</Label>
                <select value={form.period_type} onChange={e => set('period_type', e.target.value)}
                  className="w-full text-sm border rounded px-3 py-2 bg-background">
                  <option value="annual">Annual / سنوي</option>
                  <option value="quarterly">Quarterly / ربع سنوي</option>
                  <option value="monthly">Monthly / شهري</option>
                  <option value="custom">Custom / مخصص</option>
                </select>
              </div>
              <div className="space-y-1">
                <Label>Fiscal Year</Label>
                <select value={form.fiscal_year_id} onChange={e => set('fiscal_year_id', e.target.value)}
                  className="w-full text-sm border rounded px-3 py-2 bg-background">
                  <option value="">None</option>
                  {fiscalYears.map(y => <option key={y.id} value={y.id}>{y.name || y.year}</option>)}
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <Label>Fund / الصندوق</Label>
              <select value={form.fund_id} onChange={e => set('fund_id', e.target.value)}
                className="w-full text-sm border rounded px-3 py-2 bg-background">
                <option value="">No fund</option>
                {funds.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Start Date *</Label>
                <Input type="date" required value={form.start_date} onChange={e => set('start_date', e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>End Date</Label>
                <Input type="date" value={form.end_date} onChange={e => set('end_date', e.target.value)} />
              </div>
            </div>

            {error && <p className="text-red-600 text-sm">{error}</p>}

            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={loading} className="flex-1">
                <BarChart3 className="w-4 h-4 me-2" />
                {loading ? 'Creating...' : 'Create Budget / إنشاء الميزانية'}
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href="/admin/finance/budgets">Cancel</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
