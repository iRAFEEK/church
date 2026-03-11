'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { HandCoins, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

const PAYMENT_METHODS = [
  { value: 'cash', en: 'Cash', ar: 'نقد' },
  { value: 'check', en: 'Check', ar: 'شيك' },
  { value: 'bank_transfer', en: 'Bank Transfer', ar: 'تحويل بنكي' },
  { value: 'credit_card', en: 'Credit Card', ar: 'بطاقة ائتمان' },
  { value: 'online', en: 'Online', ar: 'أونلاين' },
  { value: 'mobile_payment', en: 'Mobile Payment', ar: 'دفع بالموبايل' },
  { value: 'in_kind', en: 'In-Kind', ar: 'عيني' },
  { value: 'other', en: 'Other', ar: 'أخرى' },
]

export default function NewDonationPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [funds, setFunds] = useState<Array<{ id: string; name: string; name_ar: string | null }>>([])
  const [campaigns, setCampaigns] = useState<Array<{ id: string; name: string; name_ar: string | null }>>([])
  const [members, setMembers] = useState<Array<{ id: string; first_name: string | null; last_name: string | null; first_name_ar: string | null; last_name_ar: string | null }>>([])
  const [form, setForm] = useState({
    donor_id: '', fund_id: '', campaign_id: '', amount: '',
    currency: 'USD', donation_date: new Date().toISOString().split('T')[0],
    payment_method: 'cash', check_number: '', notes: '',
    is_tithe: false, is_anonymous: false, is_tax_deductible: true,
  })

  useEffect(() => {
    Promise.all([
      fetch('/api/finance/funds').then(r => r.json()),
      fetch('/api/finance/campaigns?status=active').then(r => r.json()),
      fetch('/api/members?pageSize=100').then(r => r.json()),
    ]).then(([f, c, m]) => {
      setFunds(f.data || [])
      setCampaigns(c.data || [])
      setMembers(m.data || [])
    })
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await fetch('/api/finance/donations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        amount: parseFloat(form.amount),
        base_amount: parseFloat(form.amount),
        donor_id: form.is_anonymous ? null : form.donor_id || null,
        campaign_id: form.campaign_id || null,
      }),
    })

    if (!res.ok) {
      const err = await res.json()
      setError(err.error || 'Failed to save donation')
      setLoading(false)
      return
    }

    router.push('/admin/finance/donations')
    router.refresh()
  }

  const set = (field: string, value: string | boolean) =>
    setForm(prev => ({ ...prev, [field]: value }))

  return (
    <div className="p-6 max-w-xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/finance/donations"><ArrowLeft className="w-4 h-4" /></Link>
        </Button>
        <h1 className="text-xl font-bold">Record Donation / تسجيل تبرع</h1>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Donor */}
            <div className="flex items-center gap-2">
              <Checkbox
                id="anonymous"
                checked={form.is_anonymous}
                onCheckedChange={(v) => set('is_anonymous', !!v)}
              />
              <Label htmlFor="anonymous">Anonymous / مجهول</Label>
            </div>

            {!form.is_anonymous && (
              <div className="space-y-1">
                <Label>Donor / المتبرع</Label>
                <select
                  value={form.donor_id}
                  onChange={e => set('donor_id', e.target.value)}
                  className="w-full text-sm border rounded px-3 py-2 bg-background"
                >
                  <option value="">Select donor / اختر المتبرع</option>
                  {members.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.first_name} {m.last_name} ({m.first_name_ar} {m.last_name_ar})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Amount */}
            <div className="space-y-1">
              <Label>Amount / المبلغ *</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  required
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

            {/* Date */}
            <div className="space-y-1">
              <Label>Date / التاريخ *</Label>
              <Input
                type="date"
                required
                value={form.donation_date}
                onChange={e => set('donation_date', e.target.value)}
              />
            </div>

            {/* Fund */}
            <div className="space-y-1">
              <Label>Fund / الصندوق *</Label>
              <select
                required
                value={form.fund_id}
                onChange={e => set('fund_id', e.target.value)}
                className="w-full text-sm border rounded px-3 py-2 bg-background"
              >
                <option value="">Select fund / اختر الصندوق</option>
                {funds.map(f => (
                  <option key={f.id} value={f.id}>{f.name} {f.name_ar ? `/ ${f.name_ar}` : ''}</option>
                ))}
              </select>
            </div>

            {/* Campaign */}
            {campaigns.length > 0 && (
              <div className="space-y-1">
                <Label>Campaign / الحملة (Optional)</Label>
                <select
                  value={form.campaign_id}
                  onChange={e => set('campaign_id', e.target.value)}
                  className="w-full text-sm border rounded px-3 py-2 bg-background"
                >
                  <option value="">No campaign / بدون حملة</option>
                  {campaigns.map(c => (
                    <option key={c.id} value={c.id}>{c.name} {c.name_ar ? `/ ${c.name_ar}` : ''}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Payment method */}
            <div className="space-y-1">
              <Label>Payment Method / طريقة الدفع</Label>
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

            {form.payment_method === 'check' && (
              <div className="space-y-1">
                <Label>Check Number / رقم الشيك</Label>
                <Input value={form.check_number} onChange={e => set('check_number', e.target.value)} />
              </div>
            )}

            {/* Flags */}
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <Checkbox id="tithe" checked={form.is_tithe} onCheckedChange={(v) => set('is_tithe', !!v)} />
                <Label htmlFor="tithe">Tithe / عشور</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="taxded" checked={form.is_tax_deductible} onCheckedChange={(v) => set('is_tax_deductible', !!v)} />
                <Label htmlFor="taxded">Tax Deductible / خاضع للإعفاء</Label>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-1">
              <Label>Notes / ملاحظات</Label>
              <textarea
                value={form.notes}
                onChange={e => set('notes', e.target.value)}
                className="w-full text-sm border rounded px-3 py-2 bg-background min-h-[80px] resize-none"
              />
            </div>

            {error && <p className="text-red-600 text-sm">{error}</p>}

            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={loading} className="flex-1">
                <HandCoins className="w-4 h-4 me-2" />
                {loading ? 'Saving...' : 'Record Donation / تسجيل'}
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href="/admin/finance/donations">Cancel / إلغاء</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
