import { getCurrentUserWithRole } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { cookies } from 'next/headers'
import { Pin, Calendar } from 'lucide-react'

export default async function AnnouncementReadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getCurrentUserWithRole()
  if (!user) redirect('/login')

  const t = await getTranslations('announcements')
  const cookieStore = await cookies()
  const lang = cookieStore.get('lang')?.value || 'ar'
  const isAr = lang === 'ar'

  const supabase = await createClient()
  const { data: announcement } = await supabase
    .from('announcements')
    .select('*')
    .eq('id', id)
    .eq('status', 'published')
    .single()

  if (!announcement) notFound()

  const title = isAr ? (announcement.title_ar || announcement.title) : announcement.title
  const body = isAr ? (announcement.body_ar || announcement.body) : announcement.body

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          {announcement.is_pinned && <Pin className="h-5 w-5 text-primary" />}
          <h1 className="text-2xl font-bold text-zinc-900">{title}</h1>
        </div>
        {announcement.published_at && (
          <div className="flex items-center gap-2 mt-2 text-sm text-zinc-500">
            <Calendar className="h-4 w-4" />
            {new Date(announcement.published_at).toLocaleDateString(isAr ? 'ar-EG' : 'en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </div>
        )}
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
    </div>
  )
}
