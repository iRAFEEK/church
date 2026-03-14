import { requirePermission } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, MapPin, Mail, Phone, User, Pencil, Package } from 'lucide-react'
import { getLocale, getTranslations } from 'next-intl/server'
import { ResponseDialog } from '@/components/community/ResponseDialog'
import { ResponseList } from '@/components/community/ResponseList'
import { NEED_URGENCY_COLORS, NEED_STATUS_COLORS } from '@/lib/design/tokens'
import type { ChurchNeedResponseWithChurch } from '@/types'

interface DetailSearchParams {
  openThread?: string
}

export default async function ChurchNeedDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<DetailSearchParams> }) {
  const user = await requirePermission('can_view_church_needs')
  const t = await getTranslations('churchNeeds')
  const locale = await getLocale()
  const isAr = locale.startsWith('ar')
  const { id } = await params
  const sp = await searchParams

  const admin = await createAdminClient()

  const { data: need } = await admin
    .from('church_needs')
    .select('*, church:church_id(id, name, name_ar, country, logo_url, denomination)')
    .eq('id', id)
    .single()

  if (!need) redirect('/community/needs')

  const isOwner = need.church_id === user.profile.church_id
  const canManage = user.resolvedPermissions.can_manage_church_needs && isOwner

  // Fetch responses
  let responsesQuery = admin
    .from('church_need_responses')
    .select('*, responder_church:responder_church_id(id, name, name_ar, country, logo_url)')
    .eq('need_id', id)
    .order('created_at', { ascending: false })

  if (!isOwner) {
    responsesQuery = responsesQuery.eq('responder_church_id', user.profile.church_id)
  }

  const { data: responses } = await responsesQuery

  // Check if current church already responded
  const hasResponded = (responses || []).some(
    (r) => r.responder_church_id === user.profile.church_id
  )

  const title = isAr ? (need.title_ar || need.title) : need.title
  const description = isAr ? (need.description_ar || need.description) : need.description
  const church = need.church as { id: string; name: string; name_ar: string | null; country: string; logo_url: string | null; denomination: string | null } | null
  const churchName = isAr ? (church?.name_ar || church?.name) : church?.name

  return (
    <div className="space-y-6 px-4 py-4 md:px-6 max-w-3xl mx-auto pb-24">
      {/* Back button */}
      <Button variant="ghost" size="sm" asChild>
        <Link href="/community/needs">
          <ArrowLeft className="h-4 w-4 me-1" />
          {t('title')}
        </Link>
      </Button>

      {/* Main content */}
      <div className="space-y-4">
        {need.image_url && (
          <div className="relative w-full h-64 rounded-lg overflow-hidden bg-muted">
            <Image src={need.image_url} alt={title} fill className="object-cover" sizes="(max-width: 640px) 100vw, 600px" />
          </div>
        )}

        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">{title}</h1>
            {need.title_ar && need.title && isAr === false && (
              <p className="text-sm text-muted-foreground mt-0.5" dir="rtl">{need.title_ar}</p>
            )}
            {need.title && need.title_ar && isAr === true && (
              <p className="text-sm text-muted-foreground mt-0.5" dir="ltr">{need.title}</p>
            )}
          </div>
          {canManage && (
            <Button variant="outline" size="sm" asChild>
              <Link href={`/community/needs/${id}/edit`}>
                <Pencil className="h-4 w-4 me-1" />
                {t('editNeed')}
              </Link>
            </Button>
          )}
        </div>

        {/* Badges */}
        <div className="flex flex-wrap gap-2">
          <Badge className={NEED_STATUS_COLORS[need.status as keyof typeof NEED_STATUS_COLORS]} variant="secondary">
            {t(`statuses.${need.status}`)}
          </Badge>
          <Badge className={NEED_URGENCY_COLORS[need.urgency as keyof typeof NEED_URGENCY_COLORS]} variant="secondary">
            {t(`urgencies.${need.urgency}`)}
          </Badge>
          <Badge variant="outline">
            {t(`categories.${need.category}`)}
          </Badge>
          {need.quantity > 1 && (
            <Badge variant="outline">
              <Package className="h-3 w-3 me-1" />
              {need.quantity}
            </Badge>
          )}
        </div>

        {/* Description */}
        {description && (
          <div className="prose prose-sm max-w-none">
            <p className="whitespace-pre-wrap">{description}</p>
          </div>
        )}

        {/* Church info card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{t('churchInfo')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              {church?.logo_url && (
                <Image src={church.logo_url} alt="" width={40} height={40} className="h-10 w-10 rounded-full object-cover" />
              )}
              <div>
                <p className="font-medium">{churchName}</p>
                {church?.country && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> {church.country}
                  </p>
                )}
                {church?.denomination && (
                  <p className="text-xs text-muted-foreground">{church.denomination}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact info */}
        {(need.contact_name || need.contact_phone || need.contact_email) && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{t('contactInfo')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {need.contact_name && (
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span>{need.contact_name}</span>
                </div>
              )}
              {need.contact_phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <a href={`tel:${need.contact_phone}`} className="underline" dir="ltr">
                    {need.contact_phone}
                  </a>
                </div>
              )}
              {need.contact_email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <a href={`mailto:${need.contact_email}`} className="underline" dir="ltr">
                    {need.contact_email}
                  </a>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Offer help button (only for other churches) */}
        {!isOwner && !hasResponded && need.status === 'open' && (
          <ResponseDialog needId={id} />
        )}

        {!isOwner && hasResponded && (
          <p className="text-sm text-muted-foreground">{t('alreadyResponded')}</p>
        )}

        {/* Responses section (owner sees all, others see own) */}
        {(isOwner || hasResponded) && (
          <div className="space-y-3 pt-4">
            <h2 className="text-lg font-semibold">{t('responses')} ({(responses || []).length})</h2>
            <ResponseList
              needId={id}
              responses={(responses || []) as ChurchNeedResponseWithChurch[]}
              isOwner={isOwner}
              myChurchId={user.profile.church_id}
              initialExpandedThread={sp.openThread}
            />
          </div>
        )}
      </div>
    </div>
  )
}
