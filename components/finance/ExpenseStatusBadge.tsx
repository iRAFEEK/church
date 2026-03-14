'use client'

import { useTranslations } from 'next-intl'

const STATUS_CLASS: Record<string, string> = {
  draft:     'bg-gray-100 text-gray-700',
  submitted: 'bg-blue-100 text-blue-700',
  approved:  'bg-green-100 text-green-700',
  rejected:  'bg-red-100 text-red-700',
  paid:      'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-gray-100 text-gray-500',
}

const STATUS_KEYS: Record<string, string> = {
  draft: 'draft',
  submitted: 'submitted',
  approved: 'approved',
  rejected: 'rejected',
  paid: 'paid',
  cancelled: 'cancelled',
}

interface ExpenseStatusBadgeProps {
  status: string
}

export function ExpenseStatusBadge({ status }: ExpenseStatusBadgeProps) {
  const t = useTranslations('finance')
  const className = STATUS_CLASS[status] ?? 'bg-gray-100 text-gray-700'
  const key = STATUS_KEYS[status] ?? status
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${className}`}>
      {t(key)}
    </span>
  )
}
