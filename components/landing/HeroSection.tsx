'use client'

import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ChevronDown } from 'lucide-react'
import Image from 'next/image'

interface HeroSectionProps {
  churchName: string
  logoUrl: string | null
  primaryColor: string
  churchId: string
}

export function HeroSection({ churchName, logoUrl, primaryColor, churchId }: HeroSectionProps) {
  const t = useTranslations('landing')

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center px-4 pt-16">
      {/* Background accent */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          background: `radial-gradient(circle at 50% 30%, ${primaryColor} 0%, transparent 70%)`,
        }}
      />

      <div className="relative z-10 text-center max-w-2xl mx-auto space-y-8">
        {/* Logo */}
        {logoUrl ? (
          <Image
            src={logoUrl}
            alt={churchName}
            width={96}
            height={96}
            priority
            className="h-24 w-24 rounded-3xl object-cover mx-auto shadow-lg"
          />
        ) : (
          <div
            className="h-24 w-24 rounded-3xl flex items-center justify-center mx-auto shadow-lg"
            style={{ backgroundColor: primaryColor }}
          >
            <span className="text-white text-4xl font-bold">
              {churchName.charAt(0)}
            </span>
          </div>
        )}

        {/* Church name */}
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight">
          {churchName}
        </h1>

        {/* Tagline */}
        <p className="text-lg sm:text-xl text-muted-foreground max-w-lg mx-auto leading-relaxed">
          {t('heroTagline')}
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <Button size="lg" className="text-base px-8 h-12" asChild>
            <Link href={`/join?church=${churchId}`}>{t('heroJoinButton')}</Link>
          </Button>
          <Button size="lg" variant="outline" className="text-base px-8 h-12" asChild>
            <Link href="/login">{t('heroLoginButton')}</Link>
          </Button>
        </div>
      </div>

      {/* Scroll indicator */}
      <a
        href="#about"
        className="absolute bottom-8 left-1/2 -translate-x-1/2 text-muted-foreground/50 hover:text-muted-foreground transition-colors animate-bounce"
      >
        <ChevronDown className="h-6 w-6" />
      </a>
    </section>
  )
}
