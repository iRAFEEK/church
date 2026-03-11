'use client'

import { Badge } from '@/components/ui/badge'

const METHOD_CONFIG: Record<string, { label: string; label_ar: string; variant: 'default' | 'secondary' | 'outline' }> = {
  cash:           { label: 'Cash',          label_ar: 'نقداً',         variant: 'secondary' },
  check:          { label: 'Check',         label_ar: 'شيك',           variant: 'outline' },
  bank_transfer:  { label: 'Bank Transfer', label_ar: 'تحويل بنكي',    variant: 'outline' },
  credit_card:    { label: 'Card',          label_ar: 'بطاقة',         variant: 'default' },
  online:         { label: 'Online',        label_ar: 'إلكتروني',      variant: 'default' },
  mobile_payment: { label: 'Mobile',        label_ar: 'موبايل',        variant: 'default' },
  in_kind:        { label: 'In-Kind',       label_ar: 'عيني',          variant: 'secondary' },
  other:          { label: 'Other',         label_ar: 'أخرى',          variant: 'secondary' },
}

interface PaymentMethodBadgeProps {
  method: string
  locale?: string
}

export function PaymentMethodBadge({ method, locale = 'en' }: PaymentMethodBadgeProps) {
  const config = METHOD_CONFIG[method] ?? { label: method, label_ar: method, variant: 'secondary' as const }
  return (
    <Badge variant={config.variant}>
      {locale === 'ar' ? config.label_ar : config.label}
    </Badge>
  )
}
