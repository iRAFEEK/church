import { getCurrentUserWithRole, isAdmin } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { getTranslations, getLocale } from 'next-intl/server'
import { ServingSlotCard } from '@/components/serving/ServingSlotCard'
import { Pencil, Plus } from 'lucide-react'

export default async function ServingAreaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getCurrentUserWithRole()
  if (!user) redirect('/login')
  if (!isAdmin(user.profile)) redirect('/dashboard')

  const t = await getTranslations('serving')
  const locale = await getLocale()
  const isAr = locale.startsWith('ar')

  const supabase = await createClient()

  const { data: area } = await supabase
    .from('serving_areas')
    .select('*, ministries(name, name_ar)')
    .eq('id', id)
    .single()

  if (!area) notFound()

  const { data: rawSlots } = await supabase
    .from('serving_slots')
    .select('*, serving_areas(name, name_ar), serving_signups(id, status)')
    .eq('serving_area_id', id)
    .eq('church_id', user.profile.church_id)
    .order('date', { ascending: false })

  const slots = (rawSlots || []).map((slot: any) => ({
    ...slot,
    signup_count: slot.serving_signups?.filter((s: any) => s.status !== 'cancelled').length || 0,
    serving_signups: undefined,
  }))

  const name = isAr ? (area.name_ar || area.name) : area.name
  const description = isAr ? (area.description_ar || area.description) : area.description
  const ministryName = area.ministries
    ? (isAr ? (area.ministries.name_ar || area.ministries.name) : area.ministries.name)
    : null

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">{name}</h1>
          {ministryName && (
            <p className="text-sm text-zinc-500 mt-1">{t('ministry')}: {ministryName}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/admin/serving/areas/${id}/edit`}>
            <Button variant="outline">
              <Pencil className="h-4 w-4 me-2" />
              {t('editArea')}
            </Button>
          </Link>
          <Link href="/admin/serving/slots/new">
            <Button>
              <Plus className="h-4 w-4 me-2" />
              {t('newSlot')}
            </Button>
          </Link>
        </div>
      </div>

      {!area.is_active && (
        <Badge variant="secondary">{t('inactive')}</Badge>
      )}

      {description && (
        <div className="rounded-lg border p-4 bg-white">
          <p className="whitespace-pre-line text-sm">{description}</p>
        </div>
      )}

      <div>
        <h2 className="text-lg font-semibold mb-3">{t('tabSlots')} ({slots.length})</h2>
        {slots.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground border rounded-lg">
            {t('noSlots')}
          </div>
        ) : (
          <div className="divide-y rounded-lg border">
            {slots.map((slot: any) => (
              <ServingSlotCard key={slot.id} slot={slot} admin />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
