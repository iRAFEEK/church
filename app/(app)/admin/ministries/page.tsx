import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth'
import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export default async function MinistriesPage() {
  const user = await requireRole('ministry_leader', 'super_admin')

  const t = await getTranslations('ministries')
  const supabase = await createClient()

  const { data: ministries } = await supabase
    .from('ministries')
    .select('*, leader:leader_id(id,first_name,last_name,first_name_ar,last_name_ar,photo_url), ministry_members(count)')
    .order('name')

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">{t('pageTitle')}</h1>
          <p className="text-sm text-zinc-500 mt-1">{t('pageSubtitle')}</p>
        </div>
        <Link href="/admin/ministries/new">
          <Button>{t('newButton')}</Button>
        </Link>
      </div>

      {!ministries || ministries.length === 0 ? (
        <div className="text-center py-16 text-zinc-400">
          <p className="font-medium">{t('emptyTitle')}</p>
          <p className="text-sm mt-1">{t('emptySubtitle')}</p>
        </div>
      ) : (
        <div className="rounded-xl border border-zinc-200 divide-y divide-zinc-100">
          {ministries.map((m: any) => {
            const leader = m.leader as {
              first_name: string | null; last_name: string | null;
              first_name_ar: string | null; last_name_ar: string | null;
              photo_url: string | null
            } | null
            const memberCount = (m as any).ministry_members?.[0]?.count ?? 0

            return (
              <Link key={m.id} href={`/admin/ministries/${m.id}`} className="block">
                <div className="flex items-center gap-4 px-4 py-3 hover:bg-zinc-50 transition-colors">
                  {m.photo_url ? (
                    <img
                      src={m.photo_url}
                      alt={m.name}
                      className="w-10 h-10 rounded-lg object-cover border border-zinc-200 shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-zinc-100 flex items-center justify-center text-zinc-400 text-lg shrink-0">
                      {(m.name_ar || m.name)[0]}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-zinc-900">{m.name_ar || m.name}</span>
                      {!m.is_active && (
                        <span className="text-xs bg-zinc-100 text-zinc-500 px-2 py-0.5 rounded-full">{t('inactive')}</span>
                      )}
                    </div>
                    {m.name_ar && <p className="text-xs text-zinc-400">{m.name}</p>}
                    <div className="flex items-center gap-3 mt-1">
                      {leader && (
                        <p className="text-xs text-zinc-500">
                          {t('leaderLabel')} {leader.first_name_ar || leader.first_name} {leader.last_name_ar || leader.last_name}
                        </p>
                      )}
                      <span className="text-xs text-zinc-400">
                        {memberCount} {t('detailMembers')}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
