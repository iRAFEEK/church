'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Plus, Trash2, ArrowLeft, BookOpen } from 'lucide-react'
import Link from 'next/link'

type LineItem = {
  account_id: string
  description: string
  debit_amount: string
  credit_amount: string
}

type Account = { id: string; code: string; name: string; name_ar: string | null; is_header: boolean }

export default function NewTransactionPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [accounts, setAccounts] = useState<Account[]>([])
  const [funds, setFunds] = useState<Array<{ id: string; name: string }>>([])
  const [form, setForm] = useState({
    transaction_date: new Date().toISOString().split('T')[0],
    description: '', memo: '', currency: 'USD', fund_id: '',
  })
  const [lines, setLines] = useState<LineItem[]>([
    { account_id: '', description: '', debit_amount: '', credit_amount: '' },
    { account_id: '', description: '', debit_amount: '', credit_amount: '' },
  ])

  useEffect(() => {
    fetch('/api/finance/accounts?postable=true').then(r => r.json()).then(d => setAccounts(d.data || []))
    fetch('/api/finance/funds').then(r => r.json()).then(d => setFunds(d.data || []))
  }, [])

  const totalDebits = lines.reduce((s, l) => s + (parseFloat(l.debit_amount) || 0), 0)
  const totalCredits = lines.reduce((s, l) => s + (parseFloat(l.credit_amount) || 0), 0)
  const isBalanced = Math.abs(totalDebits - totalCredits) < 0.01 && totalDebits > 0

  const addLine = () => setLines(prev => [...prev, { account_id: '', description: '', debit_amount: '', credit_amount: '' }])
  const removeLine = (i: number) => setLines(prev => prev.filter((_, idx) => idx !== i))
  const updateLine = (i: number, field: keyof LineItem, value: string) =>
    setLines(prev => prev.map((l, idx) => idx === i ? { ...l, [field]: value } : l))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isBalanced) { setError('Journal entry must be balanced (debits = credits)'); return }
    setLoading(true); setError('')

    const res = await fetch('/api/finance/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        total_amount: totalDebits,
        fund_id: form.fund_id || null,
        line_items: lines
          .filter(l => l.account_id)
          .map(l => ({
            account_id: l.account_id,
            description: l.description || null,
            debit_amount: parseFloat(l.debit_amount) || 0,
            credit_amount: parseFloat(l.credit_amount) || 0,
            currency: form.currency,
          })),
      }),
    })

    if (!res.ok) {
      const err = await res.json()
      setError(err.error || 'Failed to create transaction')
      setLoading(false)
      return
    }

    router.push('/admin/finance/transactions')
    router.refresh()
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/finance/transactions"><ArrowLeft className="w-4 h-4" /></Link>
        </Button>
        <h1 className="text-xl font-bold">New Journal Entry / قيد يومية جديد</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <Card>
          <CardContent className="pt-6 grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Date / التاريخ *</Label>
              <Input type="date" required value={form.transaction_date}
                onChange={e => setForm(p => ({ ...p, transaction_date: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Currency / العملة</Label>
              <select value={form.currency} onChange={e => setForm(p => ({ ...p, currency: e.target.value }))}
                className="w-full text-sm border rounded px-2 py-2 bg-background">
                {['USD', 'LBP', 'EGP', 'JOD', 'EUR'].map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="col-span-2 space-y-1">
              <Label>Description / الوصف</Label>
              <Input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                placeholder="Journal entry description..." />
            </div>
            <div className="space-y-1">
              <Label>Fund / الصندوق</Label>
              <select value={form.fund_id} onChange={e => setForm(p => ({ ...p, fund_id: e.target.value }))}
                className="w-full text-sm border rounded px-2 py-2 bg-background">
                <option value="">No fund</option>
                {funds.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <Label>Memo / ملاحظة</Label>
              <Input value={form.memo} onChange={e => setForm(p => ({ ...p, memo: e.target.value }))}
                placeholder="Internal memo..." />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                Journal Lines / بنود القيد
              </h2>
              <Button type="button" variant="outline" size="sm" onClick={addLine}>
                <Plus className="w-3 h-3 mr-1" />Add Line
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground border-b">
                    <th className="pb-2 font-medium w-48">Account</th>
                    <th className="pb-2 font-medium">Description</th>
                    <th className="pb-2 font-medium w-28 text-right">Debit</th>
                    <th className="pb-2 font-medium w-28 text-right">Credit</th>
                    <th className="pb-2 w-8"></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {lines.map((line, i) => (
                    <tr key={i}>
                      <td className="py-1.5 pr-2">
                        <select
                          value={line.account_id}
                          onChange={e => updateLine(i, 'account_id', e.target.value)}
                          className="w-full text-sm border rounded px-2 py-1.5 bg-background"
                        >
                          <option value="">Select account...</option>
                          {accounts.map(a => (
                            <option key={a.id} value={a.id}>{a.code} — {a.name}</option>
                          ))}
                        </select>
                      </td>
                      <td className="py-1.5 pr-2">
                        <Input
                          value={line.description}
                          onChange={e => updateLine(i, 'description', e.target.value)}
                          placeholder="Line description"
                          className="text-sm h-8"
                        />
                      </td>
                      <td className="py-1.5 pr-2">
                        <Input
                          type="number" min="0" step="0.01"
                          value={line.debit_amount}
                          onChange={e => updateLine(i, 'debit_amount', e.target.value)}
                          placeholder="0"
                          className="text-sm h-8 text-right font-mono"
                        />
                      </td>
                      <td className="py-1.5 pr-2">
                        <Input
                          type="number" min="0" step="0.01"
                          value={line.credit_amount}
                          onChange={e => updateLine(i, 'credit_amount', e.target.value)}
                          placeholder="0"
                          className="text-sm h-8 text-right font-mono"
                        />
                      </td>
                      <td className="py-1.5">
                        {lines.length > 2 && (
                          <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0"
                            onClick={() => removeLine(i)}>
                            <Trash2 className="w-3 h-3 text-muted-foreground" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t font-mono text-sm">
                    <td colSpan={2} className="pt-2 text-right pr-2 text-muted-foreground">Totals:</td>
                    <td className={`pt-2 pr-2 text-right font-semibold ${isBalanced ? 'text-green-600' : 'text-foreground'}`}>
                      {totalDebits.toFixed(2)}
                    </td>
                    <td className={`pt-2 pr-2 text-right font-semibold ${isBalanced ? 'text-green-600' : 'text-foreground'}`}>
                      {totalCredits.toFixed(2)}
                    </td>
                    <td />
                  </tr>
                  {!isBalanced && totalDebits > 0 && (
                    <tr>
                      <td colSpan={5} className="pt-1 text-xs text-red-600">
                        Difference: {Math.abs(totalDebits - totalCredits).toFixed(2)} — entry must be balanced
                      </td>
                    </tr>
                  )}
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <div className="flex gap-2">
          <Button type="submit" disabled={loading || !isBalanced} className="flex-1">
            {loading ? 'Saving...' : 'Save Journal Entry / حفظ القيد'}
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link href="/admin/finance/transactions">Cancel</Link>
          </Button>
        </div>
      </form>
    </div>
  )
}
