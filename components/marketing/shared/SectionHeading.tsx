'use client'

import { AnimatedSection } from './AnimatedSection'

interface SectionHeadingProps {
  title: string
  subtitle?: string
}

export function SectionHeading({ title, subtitle }: SectionHeadingProps) {
  return (
    <AnimatedSection className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
      <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">{title}</h2>
      <div className="h-1 w-12 bg-primary rounded-full mx-auto mt-4" />
      {subtitle && (
        <p className="text-lg text-muted-foreground mt-4 leading-relaxed">
          {subtitle}
        </p>
      )}
    </AnimatedSection>
  )
}
