import { getCurrentUserWithRole, isAdmin } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { AnnouncementCard } from '@/components/announcements/AnnouncementCard'
import { Plus } from 'lucide-react'
import type { Announcement } from '@/types'

export default async function AnnouncementsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const user = await getCurrentUserWithRole()
  if (!user) redirect('/login')

  const t = await getTranslations('announcements')
  const admin = isAdmin(user.profile)
  const { status } = await searchParams

  const supabase = await createClient()

  let query = supabase
    .from('announcements')
    .select('*')
    .eq('church_id', user.profile.church_id)
    .order('is_pinned', { ascending: false })

  if (admin) {
    // Admins see all announcements with optional status filter
    query = query.order('created_at', { ascending: false })
    if (status) {
      query = query.eq('status', status)
    }
  } else {
    // Members see only published, non-expired
    const now = new Date().toISOString()
    query = query
      .eq('status', 'published')
      .or(`expires_at.is.null,expires_at.gt.${now}`)
      .order('published_at', { ascending: false, nullsFirst: false })
  }

  const { data: announcements } = await query

  const tabs = admin
    ? [
        { label: t('filterAll'), href: '/announcements' },
        { label: t('filterDraft'), href: '/announcements?status=draft' },
        { label: t('filterPublished'), href: '/announcements?status=published' },
        { label: t('filterArchived'), href: '/announcements?status=archived' },
      ]
    : null

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">
            {admin ? t('adminPageTitle') : t('feedTitle')}
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            {admin ? t('adminPageSubtitle') : t('feedSubtitle')}
          </p>
        </div>
        {admin && (
          <Link href="/admin/announcements/new">
            <Button>
              <Plus className="h-4 w-4 me-1" />
              {t('newAnnouncement')}
            </Button>
          </Link>
        )}
      </div>

      {tabs && (
        <div className="flex gap-2 border-b pb-2">
          {tabs.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                (status ? `/announcements?status=${status}` : '/announcements') === tab.href
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-muted'
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </div>
      )}

      {!announcements || announcements.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          {t('noAnnouncements')}
        </div>
      ) : (
        <div className="divide-y rounded-lg border">
          {announcements.map((a: Announcement) => (
            <AnnouncementCard key={a.id} announcement={a} admin={admin} />
          ))}
        </div>
      )}
    </div>
  )
}
