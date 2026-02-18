import { getCurrentUserWithRole } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { SongsTable } from '@/components/songs/SongsTable'
import { getTranslations } from 'next-intl/server'

export default async function AdminSongsPage() {
  const user = await getCurrentUserWithRole()
  if (!user) redirect('/login')
  if (!['group_leader', 'ministry_leader', 'super_admin'].includes(user.profile.role)) redirect('/')

  const t = await getTranslations('songs')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">{t('pageTitle')}</h1>
          <p className="text-sm text-zinc-500 mt-1">{t('pageSubtitle')}</p>
        </div>
        <Link href="/admin/songs/new">
          <Button>{t('addSong')}</Button>
        </Link>
      </div>

      <SongsTable />
    </div>
  )
}
