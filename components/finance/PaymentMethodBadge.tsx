'use client'

import { Badge } from '@/components/ui/badge'
import { useTranslations } from 'next-intl'

const METHOD_CONFIG: Record<string, { key: string; variant: 'default' | 'secondary' | 'outline' }> = {
  cash:           { key: 'cash',          variant: 'secondary' },
  check:          { key: 'check',         variant: 'outline' },
  bank_transfer:  { key: 'bankTransfer',  variant: 'outline' },
  credit_card:    { key: 'creditCard',    variant: 'default' },
  online:         { key: 'online',        variant: 'default' },
  mobile_payment: { key: 'mobilePayment', variant: 'default' },
  in_kind:        { key: 'inKind',        variant: 'secondary' },
  other:          { key: 'other',         variant: 'secondary' },
}

interface PaymentMethodBadgeProps {
  method: string
}

export function PaymentMethodBadge({ method }: PaymentMethodBadgeProps) {
  const t = useTranslations('finance')
  const config = METHOD_CONFIG[method] ?? { key: 'other', variant: 'secondary' as const }
  return (
    <Badge variant={config.variant}>
      {t(config.key)}
    </Badge>
  )
}
