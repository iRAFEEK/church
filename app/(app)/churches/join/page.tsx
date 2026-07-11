import { getTranslations } from 'next-intl/server'
import { Building2 } from 'lucide-react'
import { getCurrentUserWithRole } from '@/lib/auth'
import { JoinAnotherChurch } from '@/components/churches/JoinAnotherChurch'

// In-app "join another church" — an existing member searches active churches and requests
// to join; that church's admin approves in /admin/join-requests before it appears in the
// switcher. requireRole is not needed: any active member may request.
export default async function JoinAnotherChurchPage() {
  await getCurrentUserWithRole()
  const t = await getTranslations('joinAnother')

  return (
    <div className="px-4 md:px-6 pb-24 max-w-lg mx-auto">
      <header className="py-4">
        <div className="flex items-center gap-2">
          <Building2 className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold text-zinc-900">{t('title')}</h1>
        </div>
        <p className="text-sm text-zinc-500 mt-1">{t('subtitle')}</p>
      </header>

      <JoinAnotherChurch />
    </div>
  )
}
