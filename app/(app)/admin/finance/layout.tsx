import { requirePermission } from '@/lib/auth'
import { getLocale } from 'next-intl/server'
import { FinanceTabBar } from '@/components/finance/FinanceTabBar'

export default async function FinanceLayout({ children }: { children: React.ReactNode }) {
  const { resolvedPermissions } = await requirePermission('can_view_finances')
  const locale = await getLocale()

  return (
    <div className="flex flex-col min-h-0">
      <FinanceTabBar permissions={resolvedPermissions} locale={locale} />
      <div className="flex-1 min-h-0">{children}</div>
    </div>
  )
}
