'use client'

import { useLocale } from 'next-intl'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card, CardContent } from '@/components/ui/card'
import type { ChurchLeader } from '@/types'

interface LeaderCardProps {
  leader: ChurchLeader
}

export function LeaderCard({ leader }: LeaderCardProps) {
  const locale = useLocale()
  const isRTL = locale.startsWith('ar')

  const name = isRTL ? (leader.name_ar ?? leader.name) : leader.name
  const title = isRTL ? (leader.title_ar ?? leader.title) : leader.title
  const bio = isRTL ? (leader.bio_ar ?? leader.bio) : (leader.bio ?? leader.bio_ar)

  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <Card className="text-center overflow-hidden">
      <CardContent className="pt-8 pb-6 px-6 space-y-4">
        <Avatar className="h-24 w-24 mx-auto">
          <AvatarImage src={leader.photo_url ?? undefined} alt={name} />
          <AvatarFallback className="text-xl font-semibold bg-primary/10 text-primary">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="space-y-1">
          <h3 className="text-lg font-semibold">{name}</h3>
          <p className="text-sm text-muted-foreground">{title}</p>
        </div>
        {bio && (
          <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
            {bio}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
