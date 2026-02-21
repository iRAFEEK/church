import { getCurrentUserWithRole, isAdmin } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { ServingAreaCard } from '@/components/serving/ServingAreaCard'
import { ServingSlotCard } from '@/components/serving/ServingSlotCard'
import { ServingMemberView } from '@/components/serving/ServingMemberView'
import { Plus } from 'lucide-react'

export default async function ServingPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const user = await getCurrentUserWithRole()
  if (!user) redirect('/login')

  const t = await getTranslations('serving')
  const admin = isAdmin(user.profile)

  // Non-admin: render client-side member signup view
  if (!admin) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">{t('memberPageTitle')}</h1>
          <p className="text-sm text-zinc-500 mt-1">{t('memberPageSubtitle')}</p>
        </div>
        <ServingMemberView />
      </div>
    )
  }

  // Admin: server-rendered management view
  const { tab } = await searchParams
  const activeTab = tab || 'areas'
  const supabase = await createClient()

  const { data: areas } = await supabase
    .from('serving_areas')
    .select('*, ministries(name, name_ar)')
    .eq('church_id', user.profile.church_id)
    .order('name', { ascending: true })

  const { data: rawSlots } = await supabase
    .from('serving_slots')
    .select('*, serving_areas(name, name_ar), serving_signups(id, status)')
    .eq('church_id', user.profile.church_id)
    .order('date', { ascending: false })

  const slots = (rawSlots || []).map((slot: any) => ({
    ...slot,
    signup_count: slot.serving_signups?.filter((s: any) => s.status !== 'cancelled').length || 0,
    serving_signups: undefined,
  }))

  const tabs = [
    { key: 'areas', label: t('tabAreas'), href: '/serving?tab=areas' },
    { key: 'slots', label: t('tabSlots'), href: '/serving?tab=slots' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">{t('adminPageTitle')}</h1>
          <p className="text-sm text-zinc-500 mt-1">{t('adminPageSubtitle')}</p>
        </div>
        <div className="flex gap-2">
          {activeTab === 'areas' ? (
            <Link href="/admin/serving/areas/new">
              <Button>
                <Plus className="h-4 w-4 me-1" />
                {t('newArea')}
              </Button>
            </Link>
          ) : (
            <Link href="/admin/serving/slots/new">
              <Button>
                <Plus className="h-4 w-4 me-1" />
                {t('newSlot')}
              </Button>
            </Link>
          )}
        </div>
      </div>

      <div className="flex gap-2 border-b pb-2">
        {tabs.map((t2) => (
          <Link
            key={t2.key}
            href={t2.href}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
              activeTab === t2.key
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-muted'
            }`}
          >
            {t2.label}
          </Link>
        ))}
      </div>

      {activeTab === 'areas' ? (
        !areas || areas.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">{t('noAreas')}</div>
        ) : (
          <div className="divide-y rounded-lg border">
            {areas.map((area: any) => (
              <ServingAreaCard key={area.id} area={area} admin />
            ))}
          </div>
        )
      ) : (
        !slots || slots.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">{t('noSlots')}</div>
        ) : (
          <div className="divide-y rounded-lg border">
            {slots.map((slot: any) => (
              <ServingSlotCard key={slot.id} slot={slot} admin />
            ))}
          </div>
        )
      )}
    </div>
  )
}
