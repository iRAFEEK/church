import { requirePermission } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Plus, HandHelping } from 'lucide-react'
import { getLocale, getTranslations } from 'next-intl/server'
import { NeedCard } from '@/components/community/NeedCard'
import { NeedFilters } from '@/components/community/NeedFilters'
import { NeedsTabs } from '@/components/community/NeedsTabs'
import { MyNeedCard } from '@/components/community/MyNeedCard'
import { ConversationCard } from '@/components/community/ConversationCard'
import { MessageCircle } from 'lucide-react'
import type { ChurchNeedWithChurch, ChurchNeed } from '@/types'

interface SearchParams {
  category?: string
  urgency?: string
  country?: string
  search?: string
  page?: string
  tab?: string
}

function PageHeader({ title, subtitle, canManage, postLabel }: { title: string; subtitle: string; canManage: boolean; postLabel: string }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="text-muted-foreground text-sm mt-1">{subtitle}</p>
      </div>
      {canManage && (
        <Button asChild>
          <Link href="/community/needs/new">
            <Plus className="w-4 h-4 me-2" />
            {postLabel}
          </Link>
        </Button>
      )}
    </div>
  )
}

function Pagination({ page, totalPages, params }: { page: number; totalPages: number; params: SearchParams }) {
  if (totalPages <= 1) return null
  return (
    <div className="flex justify-center gap-2">
      {page > 1 && (
        <Button variant="outline" size="sm" asChild>
          <Link href={`?${new URLSearchParams({ ...params, page: String(page - 1) })}`}>
            &larr;
          </Link>
        </Button>
      )}
      <span className="text-sm text-muted-foreground self-center">
        {page} / {totalPages}
      </span>
      {page < totalPages && (
        <Button variant="outline" size="sm" asChild>
          <Link href={`?${new URLSearchParams({ ...params, page: String(page + 1) })}`}>
            &rarr;
          </Link>
        </Button>
      )}
    </div>
  )
}

export default async function ChurchNeedsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const user = await requirePermission('can_view_church_needs')
  const t = await getTranslations('churchNeeds')
  const locale = await getLocale()
  const params = await searchParams

  const canManage = user.resolvedPermissions.can_manage_church_needs
  const page = parseInt(params.page || '1')
  const pageSize = 24
  const activeTab = params.tab || 'all'

  const admin = await createAdminClient()
  const myChurchId = user.profile.church_id

  // Fetch unread count for Messages tab badge (needed on all tabs)
  const { data: allMyResponses } = await admin
    .from('church_need_responses')
    .select('id, need_id, responder_church_id, need:need_id(church_id)')
    .or(`responder_church_id.eq.${myChurchId},need_id.in.(${(await admin.from('church_needs').select('id').eq('church_id', myChurchId)).data?.map(n => n.id).join(',') || ''})`)
    .in('status', ['accepted', 'completed'])

  let totalUnread = 0
  if (allMyResponses && allMyResponses.length > 0) {
    const responseIds = allMyResponses.map(r => r.id)
    const [{ data: readStatuses }, { data: messageCounts }] = await Promise.all([
      admin.from('church_need_message_reads' as any).select('response_id, last_read_at').eq('church_id', myChurchId).in('response_id', responseIds),
      admin.from('church_need_messages' as any).select('response_id, created_at').in('response_id', responseIds),
    ])
    const readMap = new Map(((readStatuses || []) as any[]).map((r: any) => [r.response_id, r.last_read_at]))
    for (const msg of (messageCounts || []) as any[]) {
      const lastRead = readMap.get(msg.response_id)
      if (!lastRead || new Date(msg.created_at) > new Date(lastRead)) {
        totalUnread++
      }
    }
  }

  if (activeTab === 'messages') {
    // Messages tab — show conversation threads
    const conversations: {
      responseId: string
      needId: string
      needTitle: string
      needTitleAr: string | null
      otherChurch: { id: string; name: string; name_ar: string | null; logo_url: string | null }
      lastMessage: string
      lastMessageAr: string | null
      lastMessageAt: string
      unreadCount: number
    }[] = []

    if (allMyResponses && allMyResponses.length > 0) {
      const responseIds = allMyResponses.map(r => r.id)

      const [{ data: allMessages }, { data: readStatuses2 }, { data: needsData }] = await Promise.all([
        admin.from('church_need_messages' as any).select('id, response_id, message, message_ar, created_at, sender_church_id').in('response_id', responseIds).order('created_at', { ascending: false }),
        admin.from('church_need_message_reads' as any).select('response_id, last_read_at').eq('church_id', myChurchId).in('response_id', responseIds),
        admin.from('church_needs').select('id, title, title_ar, church_id').in('id', allMyResponses.map(r => r.need_id)),
      ])

      const readMap = new Map(((readStatuses2 || []) as any[]).map((r: any) => [r.response_id, r.last_read_at]))
      const needMap = new Map((needsData || []).map(n => [n.id, n]))

      // Group messages by response, take latest
      const latestByResponse = new Map<string, any>()
      const unreadByResponse = new Map<string, number>()

      for (const msg of (allMessages || []) as any[]) {
        if (!latestByResponse.has(msg.response_id)) {
          latestByResponse.set(msg.response_id, msg)
        }
        const lastRead = readMap.get(msg.response_id)
        if (!lastRead || new Date(msg.created_at) > new Date(lastRead)) {
          unreadByResponse.set(msg.response_id, (unreadByResponse.get(msg.response_id) || 0) + 1)
        }
      }

      // Get "other" church info
      const otherChurchIds = new Set<string>()
      for (const r of allMyResponses) {
        const need = needMap.get(r.need_id)
        const isResponder = r.responder_church_id === myChurchId
        otherChurchIds.add(isResponder ? (need?.church_id || '') : r.responder_church_id)
      }
      otherChurchIds.delete('')
      const { data: otherChurches } = await admin.from('churches').select('id, name, name_ar, logo_url').in('id', [...otherChurchIds])
      const churchMap = new Map((otherChurches || []).map(c => [c.id, c]))

      for (const r of allMyResponses) {
        const latest = latestByResponse.get(r.id)
        if (!latest) continue // skip threads with no messages

        const need = needMap.get(r.need_id)
        const isResponder = r.responder_church_id === myChurchId
        const otherChurchId = isResponder ? (need?.church_id || '') : r.responder_church_id
        const otherChurch = churchMap.get(otherChurchId)

        conversations.push({
          responseId: r.id,
          needId: r.need_id,
          needTitle: need?.title || '',
          needTitleAr: need?.title_ar || null,
          otherChurch: otherChurch || { id: otherChurchId, name: 'Unknown', name_ar: null, logo_url: null },
          lastMessage: latest.message,
          lastMessageAr: latest.message_ar,
          lastMessageAt: latest.created_at,
          unreadCount: unreadByResponse.get(r.id) || 0,
        })
      }

      // Sort by latest message
      conversations.sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime())
    }

    return (
      <div className="space-y-6 p-6">
        <PageHeader title={t('title')} subtitle={t('subtitle')} canManage={canManage} postLabel={t('postNeed')} />
        <NeedsTabs activeTab={activeTab} unreadCount={totalUnread} />

        {conversations.length > 0 ? (
          <div className="space-y-2">
            {conversations.map((conv) => (
              <ConversationCard key={conv.responseId} {...conv} />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p>{t('noConversations')}</p>
              <p className="text-xs mt-1">{t('noConversationsDesc')}</p>
            </CardContent>
          </Card>
        )}
      </div>
    )
  }

  if (activeTab === 'mine') {
    // "Your Needs" tab — fetch needs posted by this church with response counts
    const { data: myNeeds, count } = await admin
      .from('church_needs')
      .select('id, church_id, created_by, title, title_ar, description, description_ar, image_url, category, quantity, urgency, status, created_at, updated_at', { count: 'exact' })
      .eq('church_id', user.profile.church_id)
      .order('created_at', { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1)

    // Get response counts for these needs
    const needIds = (myNeeds || []).map(n => n.id)
    let responseCounts: Record<string, number> = {}
    if (needIds.length > 0) {
      const { data: counts } = await admin
        .from('church_need_responses')
        .select('need_id')
        .in('need_id', needIds)

      responseCounts = (counts || []).reduce((acc, r) => {
        acc[r.need_id] = (acc[r.need_id] || 0) + 1
        return acc
      }, {} as Record<string, number>)
    }

    const myNeedsWithCounts = (myNeeds || []).map(n => ({
      ...n,
      response_count: responseCounts[n.id] || 0,
    })) as (ChurchNeed & { response_count: number })[]

    const totalPages = Math.ceil((count || 0) / pageSize)

    return (
      <div className="space-y-6 p-6">
        <PageHeader title={t('title')} subtitle={t('subtitle')} canManage={canManage} postLabel={t('postNeed')} />
        <NeedsTabs activeTab={activeTab} unreadCount={totalUnread} />

        {myNeedsWithCounts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {myNeedsWithCounts.map((need) => (
              <MyNeedCard key={need.id} need={need} />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <HandHelping className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p>{t('noYourNeeds')}</p>
              {canManage && (
                <Button className="mt-4" asChild>
                  <Link href="/community/needs/new">{t('postNeed')}</Link>
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        <Pagination page={page} totalPages={totalPages} params={params} />
      </div>
    )
  }

  // "All Needs" tab — cross-church listing
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
    const sanitized = params.search.replace(/[%_(),.*]/g, '')
    if (sanitized) {
      query = query.or(`title.ilike.%${sanitized}%,title_ar.ilike.%${sanitized}%`)
    }
  }

  const [{ data: needs, count }, { data: churches }] = await Promise.all([
    query,
    admin.from('churches').select('country').eq('is_active', true),
  ])

  const countries = [...new Set((churches || []).map((c) => c.country).filter(Boolean))].sort()

  const allNeeds = (needs || []) as unknown as ChurchNeedWithChurch[]
  const filtered = params.country
    ? allNeeds.filter((n) => n.church?.country === params.country)
    : allNeeds

  const totalPages = Math.ceil((count || 0) / pageSize)

  return (
    <div className="space-y-6 p-6">
      <PageHeader title={t('title')} subtitle={t('subtitle')} canManage={canManage} postLabel={t('postNeed')} />
      <NeedsTabs activeTab={activeTab} />
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

      <Pagination page={page} totalPages={totalPages} params={params} />
    </div>
  )
}
