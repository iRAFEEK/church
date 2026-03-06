import { getTranslations } from 'next-intl/server'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

interface CTASectionProps {
  churchId: string
}

export async function CTASection({ churchId }: CTASectionProps) {
  const t = await getTranslations('landing')

  return (
    <section id="join" className="py-24 sm:py-32 px-4">
      <div className="max-w-2xl mx-auto text-center space-y-8">
        <h2 className="text-3xl sm:text-4xl font-bold">{t('ctaTitle')}</h2>
        <p className="text-lg text-muted-foreground leading-relaxed">
          {t('ctaSubtitle')}
        </p>
        <Button size="lg" className="text-base px-10 h-12" asChild>
          <Link href={`/join?church=${churchId}`}>{t('ctaButton')}</Link>
        </Button>
        <p className="text-sm text-muted-foreground">
          {t('ctaLoginPrompt')}{' '}
          <Link href="/login" className="text-primary hover:underline font-medium">
            {t('ctaLoginLink')}
          </Link>
        </p>
      </div>

      {/* Footer */}
      <div className="mt-24 text-center">
        <p className="text-xs text-muted-foreground/60">{t('footerText')}</p>
      </div>
    </section>
  )
}
