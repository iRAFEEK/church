import { notFound } from 'next/navigation'
import { getCurrentUserWithRole } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { EventDetailClient } from './EventDetailClient'

export default async function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getCurrentUserWithRole()
  const supabase = await createClient()
  const churchId = user.profile.church_id

interface Event {
  id: string
  title: string
  title_ar: string
  description: string | null
  description_ar: string | null
  event_type: string
  starts_at: string
  ends_at: string | null
  location: string | null
  capacity: number | null
  is_public: boolean
  registration_required: boolean
  status: string
}

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>()
  const t = useTranslations('events')
  const locale = useLocale()
  const isRTL = locale.startsWith('ar')
  const [event, setEvent] = useState<Event | null>(null)
  const [registered, setRegistered] = useState(false)
  const [loading, setLoading] = useState(true)
  const [registering, setRegistering] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    async function load() {
      try {
        const res = await fetch(`/api/events/${id}`, { signal: controller.signal })
        if (!res.ok || controller.signal.aborted) return
        const json = await res.json()
        if (!controller.signal.aborted) setEvent(json.data)
      } catch (e) {
        if (e instanceof Error && e.name !== 'AbortError') { /* silently fail */ }
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }
    load()
    return () => controller.abort()
  }, [id])

  const handleRegister = async () => {
    setRegistering(true)
    try {
      const res = await fetch(`/api/events/${id}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      if (res.status === 409) {
        setRegistered(true)
        toast.info(t('alreadyRegistered'))
        return
      }

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed')
      }

      setRegistered(true)
      toast.success(t('registeredSuccess'))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('errorGeneral'))
    } finally {
      setRegistering(false)
    }
  }

  if (loading) {
    return <div className="text-center py-12 text-muted-foreground">{t('loading')}</div>
  }

  if (!event) {
    notFound()
  }

  return (
    <EventDetailClient
      event={event}
      eventId={id}
      isRegistered={!!registration}
    />
  )
}

export const dynamic = 'force-dynamic'
