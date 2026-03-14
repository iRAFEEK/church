'use client'

interface CurrencyDisplayProps {
  amount: number
  currency?: string
  locale: string
  className?: string
  showSign?: boolean
}

export function CurrencyDisplay({
  amount,
  currency = 'USD',
  locale,
  className = '',
  showSign = false,
}: CurrencyDisplayProps) {
  const numberLocale = locale.startsWith('ar') ? 'ar-EG' : 'en-US'
  const formatted = new Intl.NumberFormat(numberLocale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Math.abs(amount))

  const sign = showSign && amount !== 0 ? (amount > 0 ? '+' : '−') : ''

  return (
    <span className={`tabular-nums ${className}`} dir="ltr">
      {sign}{formatted}
    </span>
  )
}
