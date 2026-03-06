import { getTranslations } from 'next-intl/server'
import type { ChurchLeader } from '@/types'
import { LeaderCard } from './LeaderCard'

interface LeadershipSectionProps {
  leaders: ChurchLeader[]
}

export async function LeadershipSection({ leaders }: LeadershipSectionProps) {
  const t = await getTranslations('landing')

  return (
    <section id="leaders" className="py-24 sm:py-32 px-4 bg-muted/30">
      <div className="max-w-5xl mx-auto space-y-12">
        <div className="text-center space-y-4">
          <h2 className="text-3xl sm:text-4xl font-bold">{t('leadersTitle')}</h2>
          <div className="h-1 w-12 bg-primary rounded-full mx-auto" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {leaders.map((leader) => (
            <LeaderCard key={leader.id} leader={leader} />
          ))}
        </div>
      </div>
    </section>
  )
}
