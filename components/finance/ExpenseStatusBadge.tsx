'use client'

import { Badge } from '@/components/ui/badge'

const STATUS_CONFIG: Record<string, { label: string; label_ar: string; className: string }> = {
  draft:     { label: 'Draft',     label_ar: 'مسودة',    className: 'bg-gray-100 text-gray-700' },
  submitted: { label: 'Submitted', label_ar: 'مقدم',     className: 'bg-blue-100 text-blue-700' },
  approved:  { label: 'Approved',  label_ar: 'معتمد',    className: 'bg-green-100 text-green-700' },
  rejected:  { label: 'Rejected',  label_ar: 'مرفوض',    className: 'bg-red-100 text-red-700' },
  paid:      { label: 'Paid',      label_ar: 'مدفوع',    className: 'bg-emerald-100 text-emerald-700' },
  cancelled: { label: 'Cancelled', label_ar: 'ملغي',     className: 'bg-gray-100 text-gray-500' },
}

interface ExpenseStatusBadgeProps {
  status: string
  locale?: string
}

export function ExpenseStatusBadge({ status, locale = 'en' }: ExpenseStatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? { label: status, label_ar: status, className: 'bg-gray-100 text-gray-700' }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${config.className}`}>
      {locale.startsWith('ar') ? config.label_ar : config.label}
    </span>
  )
}
