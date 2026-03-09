import { requirePermission } from '@/lib/auth'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { SongsTable } from '@/components/songs/SongsTable'
import { getTranslations } from 'next-intl/server'

export default async function AdminSongsPage() {
  const user = await requirePermission('can_manage_songs')

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
