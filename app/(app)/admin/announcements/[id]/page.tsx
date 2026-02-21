import { getCurrentUserWithRole, isAdmin } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { getTranslations } from 'next-intl/server'
import { cookies } from 'next/headers'
import { Pencil, Pin } from 'lucide-react'
import { AnnouncementActions } from '@/components/announcements/AnnouncementActions'

export default async function AnnouncementDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getCurrentUserWithRole()
  if (!user) redirect('/login')
  if (!isAdmin(user.profile)) redirect('/')

  const t = await getTranslations('announcements')
  const cookieStore = await cookies()
  const lang = cookieStore.get('lang')?.value || 'ar'
  const isAr = lang === 'ar'

  const supabase = await createClient()
  const { data: announcement } = await supabase
    .from('announcements')
    .select('*')
    .eq('id', id)
    .single()

  if (!announcement) notFound()

  const title = isAr ? (announcement.title_ar || announcement.title) : announcement.title
  const body = isAr ? (announcement.body_ar || announcement.body) : announcement.body

  const statusColors: Record<string, string> = {
    draft: 'bg-yellow-100 text-yellow-800',
    published: 'bg-green-100 text-green-800',
    archived: 'bg-zinc-100 text-zinc-600',
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {announcement.is_pinned && <Pin className="h-5 w-5 text-primary" />}
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-zinc-900">{title}</h1>
              <Badge className={statusColors[announcement.status] || ''} variant="secondary">
                {t(`status_${announcement.status}`)}
              </Badge>
            </div>
            {announcement.published_at && (
              <p className="text-sm text-zinc-500 mt-1">
                {t('publishedOn')} {new Date(announcement.published_at).toLocaleDateString(isAr ? 'ar-EG' : 'en-US')}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/admin/announcements/${announcement.id}/edit`}>
            <Button variant="outline">
              <Pencil className="h-4 w-4 me-2" />
              {t('edit')}
            </Button>
          </Link>
          <AnnouncementActions announcement={announcement} />
        </div>
      </div>

      {body ? (
        <div className="prose max-w-none rounded-lg border p-6 bg-white" dir={isAr ? 'rtl' : 'ltr'}>
          <p className="whitespace-pre-line">{body}</p>
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          {t('noBody')}
        </div>
      )}

      {announcement.expires_at && (
        <p className="text-sm text-muted-foreground">
          {t('expiresOn')} {new Date(announcement.expires_at).toLocaleDateString(isAr ? 'ar-EG' : 'en-US')}
        </p>
      )}
    </div>
  )
}
