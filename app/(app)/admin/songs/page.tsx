import { getCurrentUserWithRole } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { SongsTable } from '@/components/songs/SongsTable'
import { getTranslations } from 'next-intl/server'

export default async function AdminSongsPage() {
  const user = await getCurrentUserWithRole()
  if (!user) redirect('/login')

  const t = await getTranslations('songs')
  const canManage = ['super_admin', 'ministry_leader'].includes(user.profile.role)

  return (
    <div className="space-y-6 pb-24">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('pageTitle')}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t('pageSubtitle')}</p>
        </div>
        {canManage && (
          <Link href="/admin/songs/new">
            <Button>{t('addSong')}</Button>
          </Link>
        )}
      </div>

      <SongsTable />
    </div>
  )
}
