import { requirePermission } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, ChevronRight } from 'lucide-react'
import { getLocale, getTranslations } from 'next-intl/server'

type Account = {
  id: string
  code: string
  name: string
  name_ar: string | null
  account_type: string
  account_sub_type: string | null
  current_balance: number
  currency: string
  is_header: boolean
  is_active: boolean
  parent_id: string | null
  display_order: number | null
}

function fmt(n: number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 0 }).format(n)
}

const TYPE_COLOR: Record<string, string> = {
  asset:     'bg-blue-100 text-blue-700',
  liability: 'bg-orange-100 text-orange-700',
  equity:    'bg-purple-100 text-purple-700',
  income:    'bg-green-100 text-green-700',
  expense:   'bg-red-100 text-red-700',
}

function AccountRow({ account, depth = 0 }: { account: Account & { children?: Account[] }, depth?: number }) {
  return (
    <>
      <tr className={`hover:bg-muted/30 ${account.is_header ? 'bg-muted/20' : ''}`}>
        <td className="px-4 py-2">
          <div className="flex items-center gap-1" style={{ paddingLeft: `${depth * 16}px` }}>
            {account.is_header && <ChevronRight className="w-3 h-3 text-muted-foreground shrink-0" />}
            <span className={`font-mono text-xs ${account.is_header ? 'font-semibold' : ''}`}>{account.code}</span>
          </div>
        </td>
        <td className="px-4 py-2">
          <div>
            <p className={account.is_header ? 'font-semibold' : ''}>{account.name}</p>
            {account.name_ar && <p className="text-xs text-muted-foreground" dir="rtl">{account.name_ar}</p>}
          </div>
        </td>
        <td className="px-4 py-2">
          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${TYPE_COLOR[account.account_type] || 'bg-gray-100 text-gray-700'}`}>
            {account.account_type}
          </span>
        </td>
        <td className="px-4 py-2 text-end font-mono tabular-nums text-sm">
          {!account.is_header ? fmt(account.current_balance || 0, account.currency || 'USD') : '—'}
        </td>
        <td className="px-4 py-2 text-center">
          {account.is_active
            ? <span className="text-green-600 text-xs">●</span>
            : <span className="text-gray-400 text-xs">○</span>
          }
        </td>
      </tr>
      {account.children?.map(child => (
        <AccountRow key={child.id} account={child} depth={depth + 1} />
      ))}
    </>
  )
}

export default async function AccountsPage() {
  const { profile, resolvedPermissions: perms } = await requirePermission('can_manage_finances')
  const supabase = await createClient()

  const locale = await getLocale()
  const t = await getTranslations('finance')
  const isAr = locale.startsWith('ar')

  const { data: accounts } = await supabase
    .from('accounts')
    .select('id, code, name, name_ar, account_type, account_sub_type, current_balance, currency, is_header, is_active, parent_id, display_order')
    .eq('church_id', profile.church_id)
    .order('display_order', { ascending: true })
    .order('code', { ascending: true })

  // Build tree
  const all: (Account & { children: Account[] })[] = (accounts || []).map(a => ({ ...a, children: [] }))
  const map = new Map(all.map(a => [a.id, a]))
  const roots: (Account & { children: Account[] })[] = []

  all.forEach(a => {
    if (a.parent_id && map.has(a.parent_id)) {
      map.get(a.parent_id)!.children.push(a)
    } else {
      roots.push(a)
    }
  })

  const typeGroups = ['asset', 'liability', 'equity', 'income', 'expense']

  return (
    <div className="px-4 py-4 md:px-6 space-y-6 pb-24">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('chartOfAccounts')}</h1>
          <p className="text-muted-foreground text-sm">{accounts?.length ?? 0} {t('accountsCount')}</p>
        </div>
        {perms.can_manage_finances && (
          <Button asChild>
            <Link href="/admin/finance/accounts/new">
              <Plus className="w-4 h-4 me-2" />{t('newAccount')}
            </Link>
          </Button>
        )}
      </div>

      {/* Mobile card list */}
      <div className="md:hidden border rounded-lg overflow-hidden divide-y">
        {(!accounts || accounts.length === 0) && (
          <p className="px-4 py-8 text-center text-muted-foreground text-sm">{t('noAccounts')}</p>
        )}
        {typeGroups.map(type => {
          const groupAccts = (accounts || []).filter(a => a.account_type === type)
          if (groupAccts.length === 0) return null
          return (
            <div key={type}>
              <div className="px-4 py-2 bg-muted/40">
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wide ${TYPE_COLOR[type]}`}>{type}</span>
              </div>
              {groupAccts.map(a => (
                <div key={a.id} className={`px-4 py-3 flex items-start justify-between gap-3 ${a.is_header ? 'bg-muted/10' : ''}`}>
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm truncate ${a.is_header ? 'font-semibold' : ''}`}>{a.name}</p>
                    <p className="text-xs text-muted-foreground font-mono mt-0.5">{a.code}</p>
                  </div>
                  {!a.is_header && (
                    <p className="text-sm font-mono font-semibold shrink-0" dir="ltr">
                      {fmt(a.current_balance || 0, a.currency || 'USD')}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )
        })}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-start px-4 py-2 font-medium">{t('code')}</th>
              <th className="text-start px-4 py-2 font-medium">{t('name')}</th>
              <th className="text-start px-4 py-2 font-medium">{t('type')}</th>
              <th className="text-end px-4 py-2 font-medium">{t('balance')}</th>
              <th className="text-center px-4 py-2 font-medium">{t('active')}</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {typeGroups.map(type => {
              const groupRoots = roots.filter(a => a.account_type === type)
              if (groupRoots.length === 0) return null
              return (
                <>
                  <tr key={`header-${type}`} className="bg-muted/40">
                    <td colSpan={5} className="px-4 py-1.5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wide ${TYPE_COLOR[type]}`}>
                        {type}
                      </span>
                    </td>
                  </tr>
                  {groupRoots.map(a => <AccountRow key={a.id} account={a} depth={0} />)}
                </>
              )
            })}
            {(!accounts || accounts.length === 0) && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  {t('noAccounts')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
