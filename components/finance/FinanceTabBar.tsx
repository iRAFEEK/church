'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import type { PermissionKey } from '@/types'

type Tab = {
  key: string
  href: string
  labelKey: string
  permission: PermissionKey
  exact?: boolean
}

const FINANCE_TABS: Tab[] = [
  { key: 'dashboard', href: '/admin/finance', labelKey: 'dashboard', permission: 'can_view_finances', exact: true },
  { key: 'donations', href: '/admin/finance/donations', labelKey: 'donations', permission: 'can_manage_donations' },
  { key: 'expenses', href: '/admin/finance/expenses', labelKey: 'expenses', permission: 'can_submit_expenses' },
  { key: 'transactions', href: '/admin/finance/transactions', labelKey: 'transactions', permission: 'can_manage_finances' },
  { key: 'budgets', href: '/admin/finance/budgets', labelKey: 'budgets', permission: 'can_manage_budgets' },
  { key: 'campaigns', href: '/admin/finance/campaigns', labelKey: 'campaigns', permission: 'can_manage_campaigns' },
  { key: 'funds', href: '/admin/finance/funds', labelKey: 'funds', permission: 'can_view_finances' },
  { key: 'accounts', href: '/admin/finance/accounts', labelKey: 'accounts', permission: 'can_manage_finances' },
  { key: 'reports', href: '/admin/finance/reports', labelKey: 'reports', permission: 'can_view_finances' },
  { key: 'settings', href: '/admin/finance/settings', labelKey: 'settings', permission: 'can_manage_finances' },
]

interface FinanceTabBarProps {
  permissions: Record<string, boolean>
  locale: string
}

export function FinanceTabBar({ permissions }: FinanceTabBarProps) {
  const pathname = usePathname()
  const t = useTranslations('finance')

  const visibleTabs = FINANCE_TABS.filter(tab => permissions[tab.permission])

  const isActive = (tab: Tab) => {
    if (tab.exact) return pathname === tab.href
    return pathname === tab.href || pathname.startsWith(tab.href + '/')
  }

  return (
    <div className="border-b bg-background sticky top-0 z-10">
      <nav
        className="flex overflow-x-auto scrollbar-hide px-4 gap-1"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {visibleTabs.map(tab => {
          const active = isActive(tab)
          return (
            <Link
              key={tab.key}
              href={tab.href}
              className={`
                shrink-0 px-3 py-2.5 text-sm font-medium transition-colors
                border-b-2 -mb-px
                ${active
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30'
                }
              `}
            >
              {t(tab.labelKey)}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
