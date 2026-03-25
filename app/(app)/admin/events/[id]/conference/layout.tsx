import { getCurrentUserWithRole } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { getTranslations, getLocale } from 'next-intl/server'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { ConferenceTabNav } from '@/components/conference/ConferenceTabNav'
import { ChevronLeft } from 'lucide-react'

interface ConferenceLayoutProps {
  children: React.ReactNode
  params: Promise<{ id: string }>
}

export default async function ConferenceLayout({ children, params }: ConferenceLayoutProps) {
  const { id } = await params
  const user = await getCurrentUserWithRole()

  if (!user.resolvedPermissions.can_manage_events) redirect('/dashboard')

  const t = await getTranslations('conference')
  const locale = await getLocale()
  const isRTL = locale.startsWith('ar')
  const supabase = await createClient()

  const { data: event } = await supabase
    .from('events')
    .select('id, title, title_ar, conference_mode')
    .eq('id', id)
    .eq('church_id', user.profile.church_id)
    .single()

  if (!event) notFound()

  const title = isRTL ? (event.title_ar || event.title) : event.title

  return (
    <div className="space-y-4 pb-24">
      {/* Back link + event title header */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link
          href={`/admin/events/${id}`}
          className="flex items-center gap-1 hover:text-foreground transition-colors min-h-[44px] flex items-center"
        >
          <ChevronLeft className="h-4 w-4 rtl:rotate-180" />
          {t('backToEvent')}
        </Link>
        <span>/</span>
        <span className="text-foreground font-medium truncate">{title}</span>
        <Badge
          variant={event.conference_mode ? 'default' : 'secondary'}
          className="shrink-0"
        >
          {event.conference_mode ? t('modeOn') : t('modeOff')}
        </Badge>
      </div>

      {/* Tab navigation */}
      <ConferenceTabNav eventId={id} />

      {children}
    </div>
  )
}
