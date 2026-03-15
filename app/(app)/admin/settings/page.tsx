import { requireRole } from '@/lib/auth'
import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { QrCode, ShieldCheck } from 'lucide-react'

export default async function SettingsPage() {
  await requireRole('super_admin')
  const t = await getTranslations('settings')

  return (
    <div className="max-w-lg mx-auto space-y-6 px-4 py-4 pb-24">
      <div>
        <h1 className="text-2xl font-bold">{t('pageTitle')}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t('pageSubtitle')}</p>
      </div>

      <div className="grid gap-4">
        <Link href="/admin/settings/qr">
          <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
            <CardHeader className="flex flex-row items-center gap-3 pb-2">
              <QrCode className="h-5 w-5 text-primary shrink-0" />
              <div>
                <CardTitle className="text-base">{t('qrCodeTitle')}</CardTitle>
                <CardDescription>{t('qrCodeDesc')}</CardDescription>
              </div>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/admin/settings/roles">
          <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
            <CardHeader className="flex flex-row items-center gap-3 pb-2">
              <ShieldCheck className="h-5 w-5 text-primary shrink-0" />
              <div>
                <CardTitle className="text-base">{t('rolePermissionsTitle')}</CardTitle>
                <CardDescription>{t('rolePermissionsDesc')}</CardDescription>
              </div>
            </CardHeader>
          </Card>
        </Link>
      </div>
    </div>
  )
}
