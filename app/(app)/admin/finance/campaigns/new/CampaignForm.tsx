'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Target, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'

interface CampaignFormProps {
  funds: Array<{ id: string; name: string; name_ar: string | null }>
}

export function CampaignForm({ funds }: CampaignFormProps) {
  const t = useTranslations('finance')
  const router = useRouter()
  const submittingRef = useRef(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    name: '', name_ar: '', description: '', description_ar: '',
    goal_amount: '', currency: 'USD', fund_id: '',
    start_date: new Date().toISOString().split('T')[0], end_date: '',
    is_public: true, allow_pledges: true, allow_online: false,
    status: 'planning',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (submittingRef.current) return
    submittingRef.current = true
    setLoading(true)
    setError('')

    try {
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
        setError(err.error || t('failedToCreate'))
        return
      }

      router.push('/admin/finance/campaigns')
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
          <Link href="/admin/finance/campaigns"><ArrowLeft className="w-4 h-4 rtl:rotate-180" /></Link>
        </Button>
        <h1 className="text-xl font-bold">{t('newCampaign')}</h1>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>{t('nameEn')} *</Label>
                <Input required value={form.name} onChange={e => set('name', e.target.value)} placeholder="Campaign name" />
              </div>
              <div className="space-y-1">
                <Label>{t('nameAr')}</Label>
                <Input value={form.name_ar} onChange={e => set('name_ar', e.target.value)} placeholder="اسم الحملة" dir="rtl" />
              </div>
            </div>

            <div className="space-y-1">
              <Label>{t('description')}</Label>
              <textarea value={form.description} onChange={e => set('description', e.target.value)} className="w-full text-sm border rounded px-3 py-2 bg-background min-h-[60px] resize-none" placeholder="Campaign description..." />
              <textarea value={form.description_ar} onChange={e => set('description_ar', e.target.value)} className="w-full text-sm border rounded px-3 py-2 bg-background min-h-[60px] resize-none mt-1" placeholder="الوصف بالعربية..." dir="rtl" />
            </div>

            <div className="space-y-1">
              <Label>{t('goalAmount')} *</Label>
              <div className="flex gap-2">
                <Input type="number" min="0" step="1" required value={form.goal_amount} onChange={e => set('goal_amount', e.target.value)} placeholder="0" />
                <select value={form.currency} onChange={e => set('currency', e.target.value)} className="text-sm border rounded px-2 bg-background w-24">
                  {['USD', 'LBP', 'EGP', 'JOD', 'EUR'].map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <Label>{t('fund')}</Label>
              <select value={form.fund_id} onChange={e => set('fund_id', e.target.value)} className="w-full text-sm border rounded px-3 py-2 bg-background">
                <option value="">{t('noFundSelected')}</option>
                {funds.map(f => <option key={f.id} value={f.id}>{f.name} {f.name_ar ? `/ ${f.name_ar}` : ''}</option>)}
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

            <div className="space-y-1">
              <Label>{t('status')}</Label>
              <select value={form.status} onChange={e => set('status', e.target.value)} className="w-full text-sm border rounded px-3 py-2 bg-background">
                <option value="planning">{t('planning')}</option>
                <option value="active">{t('active')}</option>
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Checkbox id="public" checked={form.is_public} onCheckedChange={(v) => set('is_public', !!v)} />
                <Label htmlFor="public">{t('visibleToMembers')}</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="pledges" checked={form.allow_pledges} onCheckedChange={(v) => set('allow_pledges', !!v)} />
                <Label htmlFor="pledges">{t('allowPledges')}</Label>
              </div>
            </div>

            {error && <p className="text-red-600 text-sm">{error}</p>}

            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={loading} className="flex-1">
                <Target className="w-4 h-4 me-2" />
                {loading ? t('creating') : t('createCampaign')}
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href="/admin/finance/campaigns">{t('cancel')}</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
