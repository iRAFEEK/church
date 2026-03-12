import { requirePermission } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Plus, HandHelping } from 'lucide-react'
import { getLocale, getTranslations } from 'next-intl/server'
import { NeedCard } from '@/components/community/NeedCard'
import { NeedFilters } from '@/components/community/NeedFilters'
import type { ChurchNeedWithChurch } from '@/types'

interface SearchParams {
  category?: string
  urgency?: string
  country?: string
  search?: string
  page?: string
}

export default async function ChurchNeedsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const user = await requirePermission('can_view_church_needs')
  const t = await getTranslations('churchNeeds')
  const locale = await getLocale()
  const params = await searchParams

  const canManage = user.resolvedPermissions.can_manage_church_needs
  const page = parseInt(params.page || '1')
  const pageSize = 24

  // Cross-church query via admin client
  const admin = await createAdminClient()

  let query = admin
    .from('church_needs')
    .select(
      'id, church_id, title, title_ar, description, description_ar, image_url, category, quantity, urgency, status, created_at, church:church_id(id, name, name_ar, country, logo_url, denomination)',
      { count: 'exact' }
    )
    .in('status', ['open', 'in_progress'])
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
    .order('created_at', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1)

  if (params.category) query = query.eq('category', params.category)
  if (params.urgency) query = query.eq('urgency', params.urgency)
  if (params.search) {
    query = query.or(`title.ilike.%${params.search}%,title_ar.ilike.%${params.search}%`)
  }

  const [{ data: needs, count }, { data: churches }] = await Promise.all([
    query,
    admin.from('churches').select('country').eq('is_active', true),
  ])

  const countries = [...new Set((churches || []).map((c) => c.country).filter(Boolean))].sort()

  // Filter by country client-side (since it's on joined table)
  const allNeeds = (needs || []) as unknown as ChurchNeedWithChurch[]
  const filtered = params.country
    ? allNeeds.filter((n) => n.church?.country === params.country)
    : allNeeds

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('title')}</h1>
          <p className="text-muted-foreground text-sm mt-1">{t('subtitle')}</p>
        </div>
        {canManage && (
          <Button asChild>
            <Link href="/community/needs/new">
              <Plus className="w-4 h-4 me-2" />
              {t('postNeed')}
            </Link>
          </Button>
        )}
      </div>

      <NeedFilters countries={countries} />

      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((need) => (
            <NeedCard key={need.id} need={need} />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <HandHelping className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p>{t('noNeeds')}</p>
            <p className="text-xs mt-1">{t('noNeedsDesc')}</p>
            {canManage && (
              <Button className="mt-4" asChild>
                <Link href="/community/needs/new">{t('postNeed')}</Link>
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Pagination */}
      {(count || 0) > pageSize && (
        <div className="flex justify-center gap-2">
          {page > 1 && (
            <Button variant="outline" size="sm" asChild>
              <Link href={`?${new URLSearchParams({ ...params, page: String(page - 1) })}`}>
                &larr;
              </Link>
            </Button>
          )}
          <span className="text-sm text-muted-foreground self-center">
            {page} / {Math.ceil((count || 0) / pageSize)}
          </span>
          {page < Math.ceil((count || 0) / pageSize) && (
            <Button variant="outline" size="sm" asChild>
              <Link href={`?${new URLSearchParams({ ...params, page: String(page + 1) })}`}>
                &rarr;
              </Link>
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
