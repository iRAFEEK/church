'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Settings, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'
import { useTranslations } from 'next-intl'

const CURRENCIES = ['USD', 'LBP', 'EGP', 'JOD', 'EUR', 'GBP', 'SAR', 'AED', 'KWD', 'BHD', 'QAR', 'OMR']

interface SettingsData {
  default_currency: string
  supported_currencies: string[]
  fiscal_year_start_month: number
  financial_approval_required: boolean
  donation_receipt_enabled: boolean
  online_giving_enabled: boolean
}

export function SettingsForm({ initialData }: { initialData: SettingsData }) {
  const t = useTranslations('finance')
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [form, setForm] = useState<SettingsData>(initialData)

  const toggleCurrency = (c: string) => {
    setForm(prev => ({
      ...prev,
      supported_currencies: prev.supported_currencies.includes(c)
        ? prev.supported_currencies.filter(x => x !== c)
        : [...prev.supported_currencies, c],
    }))
  }

  const set = (field: string, value: string | boolean | number) => setForm(p => ({ ...p, [field]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setSaved(false)
    try {
      const res = await fetch('/api/church/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        toast.error(body.error || t('failedToSave'))
        return
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch {
      toast.error(t('networkError'))
    } finally {
      setLoading(false)
    }
  }

  const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December']

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Settings className="w-6 h-6" />
        <h1 className="text-xl font-bold">{t('settingsTitle')}</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Currency */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t('currency')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label>{t('defaultCurrency')}</Label>
              <select value={form.default_currency} onChange={e => set('default_currency', e.target.value)}
                className="w-full text-sm border rounded px-3 py-2 bg-background max-w-xs">
                {CURRENCIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <Label>{t('supportedCurrencies')}</Label>
              <div className="flex flex-wrap gap-2">
                {CURRENCIES.map(c => (
                  <label key={c} className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.supported_currencies.includes(c)}
                      onChange={() => toggleCurrency(c)}
                      className="rounded"
                    />
                    <span className="text-sm font-mono">{c}</span>
                  </label>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Fiscal Year */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t('fiscalYear')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <Label>{t('fiscalYearStartMonth')}</Label>
              <select value={form.fiscal_year_start_month}
                onChange={e => set('fiscal_year_start_month', parseInt(e.target.value))}
                className="w-full text-sm border rounded px-3 py-2 bg-background max-w-xs">
                {MONTH_NAMES.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Workflow */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t('workflow')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <Checkbox
                id="approval"
                checked={form.financial_approval_required}
                onCheckedChange={v => set('financial_approval_required', !!v)}
              />
              <Label htmlFor="approval">{t('requireApproval')}</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="receipt"
                checked={form.donation_receipt_enabled}
                onCheckedChange={v => set('donation_receipt_enabled', !!v)}
              />
              <Label htmlFor="receipt">{t('enableReceipts')}</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="online"
                checked={form.online_giving_enabled}
                onCheckedChange={v => set('online_giving_enabled', !!v)}
              />
              <Label htmlFor="online">{t('enableOnlineGiving')}</Label>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={loading}>
            {loading ? t('saving') : t('saveSettings')}
          </Button>
          {saved && (
            <span className="flex items-center gap-1.5 text-sm text-green-600">
              <CheckCircle className="w-4 h-4" />{t('settingsSaved')}
            </span>
          )}
        </div>
      </form>
    </div>
  )
}
