'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { ArrowLeft, BarChart3 } from 'lucide-react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'

interface BudgetFormProps {
  funds: Array<{ id: string; name: string; name_ar: string | null }>
  fiscalYears: Array<{ id: string; name: string; start_date: string; end_date: string; is_current: boolean }>
}

export function BudgetForm({ funds, fiscalYears }: BudgetFormProps) {
  const router = useRouter()
  const t = useTranslations('finance')
  const submittingRef = useRef(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    name: '', name_ar: '', description: '',
    total_income: '',
    period_type: 'annual', fund_id: '', fiscal_year_id: '',
    start_date: new Date().toISOString().split('T')[0], end_date: '',
  })

  const set = (field: string, value: string) => setForm(p => ({ ...p, [field]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (submittingRef.current) return
    submittingRef.current = true
    setLoading(true); setError('')

    try {
      const res = await fetch('/api/finance/budgets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          total_income: parseFloat(form.total_income),
          fund_id: form.fund_id || null,
          fiscal_year_id: form.fiscal_year_id || null,
          end_date: form.end_date || null,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        setError(err.error || t('failedToCreate'))
        return
      }

      router.push('/admin/finance/budgets')
      router.refresh()
    } catch {
      setError(t('networkError'))
    } finally {
      submittingRef.current = false
      setLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/finance/budgets"><ArrowLeft className="w-4 h-4 rtl:rotate-180" /></Link>
        </Button>
        <h1 className="text-xl font-bold">{t('newBudget')}</h1>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>{t('nameEn')} *</Label>
                <Input required value={form.name} onChange={e => set('name', e.target.value)} placeholder={t('budgetName')} dir="auto" className="text-base" />
              </div>
              <div className="space-y-1">
                <Label>{t('nameAr')}</Label>
                <Input value={form.name_ar} onChange={e => set('name_ar', e.target.value)} placeholder={t('budgetName')} dir="auto" className="text-base" />
              </div>
            </div>

            <div className="space-y-1">
              <Label>{t('totalAmount')} *</Label>
              <Input type="number" min="0" step="1" required value={form.total_income}
                onChange={e => set('total_income', e.target.value)} placeholder="0" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>{t('periodType')}</Label>
                <select value={form.period_type} onChange={e => set('period_type', e.target.value)}
                  className="w-full text-sm border rounded px-3 py-2 bg-background">
                  <option value="annual">{t('annual')}</option>
                  <option value="quarterly">{t('quarterly')}</option>
                  <option value="monthly">{t('monthly')}</option>
                  <option value="custom">{t('custom')}</option>
                </select>
              </div>
              <div className="space-y-1">
                <Label>{t('fiscalYear')}</Label>
                <select value={form.fiscal_year_id} onChange={e => set('fiscal_year_id', e.target.value)}
                  className="w-full text-sm border rounded px-3 py-2 bg-background">
                  <option value="">{t('none')}</option>
                  {fiscalYears.map(y => <option key={y.id} value={y.id}>{y.name}</option>)}
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <Label>{t('fund')}</Label>
              <select value={form.fund_id} onChange={e => set('fund_id', e.target.value)}
                className="w-full text-sm border rounded px-3 py-2 bg-background">
                <option value="">{t('noFund')}</option>
                {funds.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>{t('startDate')} *</Label>
                <Input type="date" required value={form.start_date} onChange={e => set('start_date', e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>{t('endDate')}</Label>
                <Input type="date" value={form.end_date} onChange={e => set('end_date', e.target.value)} />
              </div>
            </div>

            {error && <p className="text-red-600 text-sm">{error}</p>}

            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={loading} className="flex-1">
                <BarChart3 className="w-4 h-4 me-2" />
                {loading ? t('creating') : t('createBudget')}
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href="/admin/finance/budgets">{t('cancel')}</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
