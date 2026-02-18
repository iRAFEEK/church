import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  const t = useTranslations('notFound')

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4 p-8">
        <h1 className="text-8xl font-bold text-muted-foreground/20">404</h1>
        <h2 className="text-2xl font-bold">{t('title')}</h2>
        <p className="text-muted-foreground">
          {t('description')}
        </p>
        <Button asChild>
          <Link href="/">{t('goHome')}</Link>
        </Button>
      </div>
    </div>
  )
}
