import { requirePermission } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Plus, Wallet, Lock } from 'lucide-react'
import { getLocale, getTranslations } from 'next-intl/server'

function formatCurrency(amount: number, currency = 'USD', locale = 'en') {
  return new Intl.NumberFormat(locale.startsWith('ar') ? 'ar-EG' : 'en-US', {
    style: 'currency', currency,
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(amount)
}

export default async function FundsPage() {
  const { profile } = await requirePermission('can_view_finances')
  const supabase = await createClient()
  const locale = await getLocale()
  const t = await getTranslations('finance')
  const isAr = locale.startsWith('ar')
  const canManage = profile.role === 'super_admin'

  const { data: funds } = await supabase
    .from('funds')
    .select('id, name, name_ar, code, description, description_ar, current_balance, target_amount, color, is_active, is_default, is_restricted, display_order')
    .eq('church_id', profile.church_id)
    .order('display_order', { ascending: true })
    .order('name', { ascending: true })

  const totalBalance = (funds || []).reduce((s, f) => s + f.current_balance, 0)
  const activeFunds = (funds || []).filter((f) => f.is_active)
  const restrictedFunds = activeFunds.filter((f) => f.is_restricted)

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('funds')}</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {t('manageFundsDesc')}
          </p>
        </div>
        {canManage && (
          <Button asChild>
            <Link href="/admin/finance/funds/new">
              <Plus className="w-4 h-4 me-2" />
              {t('newFund')}
            </Link>
          </Button>
        )}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">{t('totalBalance')}</p>
            <p className="text-xl font-bold mt-1 tabular-nums" dir="ltr">{formatCurrency(totalBalance, 'USD', locale)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">{t('activeFunds')}</p>
            <p className="text-xl font-bold mt-1">{activeFunds.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">{t('restricted')}</p>
            <p className="text-xl font-bold mt-1">{restrictedFunds.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Fund Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {(funds || []).map((fund) => {
          const pct = fund.target_amount && fund.target_amount > 0
            ? Math.min(100, (fund.current_balance / fund.target_amount) * 100)
            : null

          return (
            <Card key={fund.id} className={!fund.is_active ? 'opacity-50' : ''}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: fund.color ? `${fund.color}20` : '#18181b20' }}
                    >
                      <Wallet className="w-4 h-4" style={{ color: fund.color || '#18181b' }} />
                    </div>
                    <div>
                      <CardTitle className="text-sm">{isAr ? fund.name_ar || fund.name : fund.name}</CardTitle>
                      {fund.code && <p className="text-xs text-muted-foreground">{fund.code}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {fund.is_restricted && (
                      <Badge variant="outline" className="text-xs flex items-center gap-1">
                        <Lock className="w-2.5 h-2.5" />
                        {t('restricted')}
                      </Badge>
                    )}
                    {fund.is_default && (
                      <Badge className="text-xs">{t('default')}</Badge>
                    )}
                    {!fund.is_active && (
                      <Badge variant="secondary" className="text-xs">{t('inactive')}</Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {fund.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {isAr ? fund.description_ar || fund.description : fund.description}
                  </p>
                )}

                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{t('currentBalance')}</span>
                    <span className="text-xl font-bold tabular-nums" dir="ltr">{formatCurrency(fund.current_balance, 'USD', locale)}</span>
                  </div>
                  {fund.target_amount && (
                    <>
                      <div className="flex items-center justify-between text-xs text-muted-foreground mt-1">
                        <span>{t('target')}: <span className="tabular-nums" dir="ltr">{formatCurrency(fund.target_amount, 'USD', locale)}</span></span>
                        <span>{pct?.toFixed(0)}%</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2 mt-1">
                        <div
                          className="bg-primary h-2 rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </>
                  )}
                </div>

                {canManage && (
                  <Button variant="outline" size="sm" className="w-full" asChild>
                    <Link href={`/admin/finance/funds/${fund.id}/edit`}>
                      {t('edit')}
                    </Link>
                  </Button>
                )}
              </CardContent>
            </Card>
          )
        })}

        {canManage && (
          <Card className="border-dashed hover:border-primary/50 transition-colors cursor-pointer">
            <CardContent className="pt-6 flex flex-col items-center justify-center h-40 gap-2">
              <Link href="/admin/finance/funds/new" className="flex flex-col items-center gap-2 text-muted-foreground hover:text-primary transition-colors">
                <Plus className="w-8 h-8" />
                <span className="text-sm">{t('addNewFund')}</span>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
