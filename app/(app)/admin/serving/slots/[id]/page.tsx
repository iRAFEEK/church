import { getCurrentUserWithRole, isAdmin } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { getTranslations } from 'next-intl/server'
import { cookies } from 'next/headers'
import { Pencil, Calendar, Clock, Users, Trash2 } from 'lucide-react'
import { ServingSignupList } from '@/components/serving/ServingSignupList'
import { SlotDeleteButton } from './SlotDeleteButton'

export default async function SlotDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getCurrentUserWithRole()
  if (!user) redirect('/login')
  if (!isAdmin(user.profile)) redirect('/')

  const t = await getTranslations('serving')
  const cookieStore = await cookies()
  const lang = cookieStore.get('lang')?.value || 'ar'
  const isAr = lang === 'ar'

  const supabase = await createClient()
  const { data: slot } = await supabase
    .from('serving_slots')
    .select('*, serving_areas(name, name_ar), serving_signups(id, profile_id, status, signed_up_at, profiles(first_name, last_name, first_name_ar, last_name_ar, phone))')
    .eq('id', id)
    .single()

  if (!slot) notFound()

  const title = isAr ? (slot.title_ar || slot.title) : slot.title
  const areaName = slot.serving_areas
    ? (isAr ? (slot.serving_areas.name_ar || slot.serving_areas.name) : slot.serving_areas.name)
    : null
  const notes = isAr ? (slot.notes_ar || slot.notes) : slot.notes
  const activeSignups = slot.serving_signups?.filter((s: any) => s.status !== 'cancelled') || []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">{title}</h1>
          {areaName && <p className="text-sm text-zinc-500 mt-1">{areaName}</p>}
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/admin/serving/slots/${slot.id}/edit`}>
            <Button variant="outline">
              <Pencil className="h-4 w-4 me-2" />
              {t('edit')}
            </Button>
          </Link>
          <SlotDeleteButton slotId={slot.id} slotTitle={title} />
        </div>
      </div>

      <div className="flex items-center gap-6 text-sm text-muted-foreground">
        <span className="flex items-center gap-1">
          <Calendar className="h-4 w-4" />
          {new Date(slot.date).toLocaleDateString(isAr ? 'ar-EG' : 'en-US')}
        </span>
        {slot.start_time && (
          <span className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            {slot.start_time.slice(0, 5)}{slot.end_time ? ` – ${slot.end_time.slice(0, 5)}` : ''}
          </span>
        )}
        <span className="flex items-center gap-1">
          <Users className="h-4 w-4" />
          {activeSignups.length}{slot.max_volunteers ? `/${slot.max_volunteers}` : ''} {t('volunteers')}
        </span>
      </div>

      {notes && (
        <div className="rounded-lg border p-4 bg-white">
          <p className="whitespace-pre-line text-sm">{notes}</p>
        </div>
      )}

      <div>
        <h2 className="text-lg font-semibold mb-3">{t('signups')}</h2>
        <ServingSignupList signups={slot.serving_signups || []} />
      </div>
    </div>
  )
}
