'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { ArrowLeft, Plus } from 'lucide-react'

const ACCOUNT_TYPES = ['asset', 'liability', 'equity', 'income', 'expense'] as const

export default function NewAccountPage() {
  const router = useRouter()
  const t = useTranslations('finance')
  const submittingRef = useRef(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    code: '',
    name: '',
    name_ar: '',
    account_type: 'asset' as string,
    account_sub_type: '',
    currency: 'EGP',
    is_header: false,
    is_active: true,
    display_order: '0',
  })

  const set = (field: string, value: string | boolean) =>
    setForm(p => ({ ...p, [field]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (submittingRef.current) return
    submittingRef.current = true
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/finance/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: form.code,
          name: form.name,
          name_ar: form.name_ar || null,
          account_type: form.account_type,
          account_sub_type: form.account_sub_type || null,
          currency: form.currency,
          is_header: form.is_header,
          is_active: form.is_active,
          display_order: parseInt(form.display_order) || 0,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        setError(err.error || t('failedToCreate'))
        return
      }

      router.push('/admin/finance/accounts')
      router.refresh()
    } catch {
      setError(t('networkError'))
    } finally {
      submittingRef.current = false
      setLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-xl mx-auto space-y-6 pb-24">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/finance/accounts">
            <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
          </Link>
        </Button>
        <h1 className="text-xl font-bold">{t('newAccount')}</h1>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>{t('code')} *</Label>
                <Input
                  required
                  value={form.code}
                  onChange={e => set('code', e.target.value)}
                  placeholder="1000"
                  dir="ltr"
                  className="text-base font-mono"
                />
              </div>
              <div className="space-y-1">
                <Label>{t('type')} *</Label>
                <select
                  value={form.account_type}
                  onChange={e => set('account_type', e.target.value)}
                  className="w-full text-sm border rounded px-3 py-2 bg-background"
                >
                  {ACCOUNT_TYPES.map(type => (
                    <option key={type} value={type}>
                      {t(`accountType_${type}`)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>{t('nameEn')} *</Label>
                <Input
                  required
                  value={form.name}
                  onChange={e => set('name', e.target.value)}
                  placeholder={t('accountNamePlaceholder')}
                  dir="auto"
                  className="text-base"
                />
              </div>
              <div className="space-y-1">
                <Label>{t('nameAr')}</Label>
                <Input
                  value={form.name_ar}
                  onChange={e => set('name_ar', e.target.value)}
                  placeholder={t('accountNamePlaceholder')}
                  dir="auto"
                  className="text-base"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>{t('currency')}</Label>
                <Input
                  value={form.currency}
                  onChange={e => set('currency', e.target.value)}
                  placeholder="EGP"
                  dir="ltr"
                  className="text-base"
                />
              </div>
              <div className="space-y-1">
                <Label>{t('displayOrder')}</Label>
                <Input
                  type="number"
                  min="0"
                  value={form.display_order}
                  onChange={e => set('display_order', e.target.value)}
                  placeholder="0"
                />
              </div>
            </div>

            <div className="flex items-center justify-between py-2">
              <Label htmlFor="is_header">{t('isHeader')}</Label>
              <Switch
                id="is_header"
                checked={form.is_header}
                onCheckedChange={v => set('is_header', v)}
              />
            </div>

            <div className="flex items-center justify-between py-2">
              <Label htmlFor="is_active">{t('isActive')}</Label>
              <Switch
                id="is_active"
                checked={form.is_active}
                onCheckedChange={v => set('is_active', v)}
              />
            </div>

            {error && <p className="text-red-600 text-sm">{error}</p>}

            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={loading} className="flex-1">
                <Plus className="w-4 h-4 me-2" />
                {loading ? t('creating') : t('createAccount')}
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href="/admin/finance/accounts">{t('cancel')}</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
