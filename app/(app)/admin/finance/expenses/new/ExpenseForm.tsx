'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Receipt, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'

const PAYMENT_KEYS = [
  { value: 'cash', key: 'cash' },
  { value: 'check', key: 'check' },
  { value: 'bank_transfer', key: 'bankTransfer' },
  { value: 'other', key: 'other' },
]

interface ExpenseFormProps {
  ministries: Array<{ id: string; name: string; name_ar: string | null }>
  funds: Array<{ id: string; name: string; name_ar: string | null }>
}

export function ExpenseForm({ ministries, funds }: ExpenseFormProps) {
  const router = useRouter()
  const t = useTranslations('finance')
  const submittingRef = useRef(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    description: '', description_ar: '', amount: '',
    currency: 'USD', vendor_name: '', vendor_name_ar: '',
    ministry_id: '', fund_id: '', notes: '',
    is_reimbursement: false, payment_method: 'cash',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (submittingRef.current) return
    submittingRef.current = true
    setLoading(true)
    setError('')

    try {
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
        setError(err.error || t('failedToSubmit'))
        return
      }

      router.push('/admin/finance/expenses')
      router.refresh()
    } catch {
      setError(t('networkError'))
    } finally {
      submittingRef.current = false
      setLoading(false)
    }
  }

  const set = (field: string, value: string | boolean) =>
    setForm(prev => ({ ...prev, [field]: value }))

  return (
    <div className="p-6 max-w-xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/finance/expenses"><ArrowLeft className="w-4 h-4 rtl:rotate-180" /></Link>
        </Button>
        <h1 className="text-xl font-bold">{t('newExpense')}</h1>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <Label>{t('description')} *</Label>
              <Input
                required
                value={form.description}
                onChange={e => set('description', e.target.value)}
                placeholder={t('descriptionEn')}
              />
              <Input
                value={form.description_ar}
                onChange={e => set('description_ar', e.target.value)}
                placeholder={t('descriptionAr')}
                dir="rtl"
              />
            </div>

            <div className="space-y-1">
              <Label>{t('amount')} *</Label>
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
              <Label>{t('vendor')}</Label>
              <Input
                value={form.vendor_name}
                onChange={e => set('vendor_name', e.target.value)}
                placeholder={t('vendorNamePlaceholder')}
              />
            </div>

            <div className="space-y-1">
              <Label>{t('ministry')}</Label>
              <select
                value={form.ministry_id}
                onChange={e => set('ministry_id', e.target.value)}
                className="w-full text-sm border rounded px-3 py-2 bg-background"
              >
                <option value="">{t('selectMinistry')}</option>
                {ministries.map(m => (
                  <option key={m.id} value={m.id}>{m.name} {m.name_ar ? `/ ${m.name_ar}` : ''}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <Label>{t('fund')}</Label>
              <select
                value={form.fund_id}
                onChange={e => set('fund_id', e.target.value)}
                className="w-full text-sm border rounded px-3 py-2 bg-background"
              >
                <option value="">{t('selectFundOptional')}</option>
                {funds.map(f => (
                  <option key={f.id} value={f.id}>{f.name} {f.name_ar ? `/ ${f.name_ar}` : ''}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <Label>{t('preferredPayment')}</Label>
              <select
                value={form.payment_method}
                onChange={e => set('payment_method', e.target.value)}
                className="w-full text-sm border rounded px-3 py-2 bg-background"
              >
                {PAYMENT_KEYS.map(m => (
                  <option key={m.value} value={m.value}>{t(m.key)}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="reimburse"
                checked={form.is_reimbursement}
                onCheckedChange={(v) => set('is_reimbursement', !!v)}
              />
              <Label htmlFor="reimburse">{t('reimbursementNote')}</Label>
            </div>

            <div className="space-y-1">
              <Label>{t('notes')}</Label>
              <textarea
                value={form.notes}
                onChange={e => set('notes', e.target.value)}
                className="w-full text-sm border rounded px-3 py-2 bg-background min-h-[80px] resize-none"
                placeholder={t('additionalDetails')}
              />
            </div>

            {error && <p className="text-red-600 text-sm">{error}</p>}

            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={loading} className="flex-1">
                <Receipt className="w-4 h-4 me-2" />
                {loading ? t('saving') : t('submitRequest')}
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href="/admin/finance/expenses">{t('cancel')}</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
