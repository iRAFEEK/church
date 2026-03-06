import { getTranslations } from 'next-intl/server'

interface AboutSectionProps {
  message: string
}

export async function AboutSection({ message }: AboutSectionProps) {
  const t = await getTranslations('landing')

  return (
    <section id="about" className="py-24 sm:py-32 px-4">
      <div className="max-w-3xl mx-auto text-center space-y-8">
        <h2 className="text-3xl sm:text-4xl font-bold">{t('aboutTitle')}</h2>
        <div className="h-1 w-12 bg-primary rounded-full mx-auto" />
        <p className="text-lg text-muted-foreground leading-relaxed whitespace-pre-line">
          {message}
        </p>
      </div>
    </section>
  )
}
