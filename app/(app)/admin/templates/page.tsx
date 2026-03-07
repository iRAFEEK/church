import { getCurrentUserWithRole } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { getTranslations, getLocale } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { Plus, Users, ListOrdered, Pencil, Copy } from 'lucide-react'

const EVENT_TYPE_ICONS: Record<string, string> = {
  service: '⛪', conference: '🎤', retreat: '🏕️', workshop: '📝',
  social: '🎉', outreach: '🤝', other: '📌',
}

export default async function TemplatesPage() {
  const user = await getCurrentUserWithRole()
  if (!user) redirect('/login')
  if (!['ministry_leader', 'super_admin'].includes(user.profile.role)) redirect('/dashboard')

  const t = await getTranslations('templates')
  const te = await getTranslations('events')
  const locale = await getLocale()
  const isRTL = locale === 'ar'
  const supabase = await createClient()

  const { data: templates } = await supabase
    .from('event_templates')
    .select(`
      *,
      event_template_needs(id),
      event_template_segments(id)
    `)
    .eq('church_id', user.profile.church_id)
    .eq('is_active', true)
    .order('name', { ascending: true })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">{t('pageTitle')}</h1>
          <p className="text-sm text-zinc-500 mt-1">{t('pageSubtitle')}</p>
        </div>
        <Link href="/admin/templates/new">
          <Button>
            <Plus className="h-4 w-4 me-1" />
            {t('newTemplate')}
          </Button>
        </Link>
      </div>

      {!templates || templates.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-xl">
          {t('noTemplates')}
        </div>
      ) : (
        <div className="divide-y rounded-lg border">
          {templates.map((tmpl: any) => {
            const name = isRTL ? (tmpl.name_ar || tmpl.name) : tmpl.name
            const needsCount = tmpl.event_template_needs?.length || 0
            const segmentsCount = tmpl.event_template_segments?.length || 0

            return (
              <div key={tmpl.id} className="flex items-center gap-4 p-4 hover:bg-zinc-50 transition-colors">
                <div className="flex-shrink-0 text-2xl">
                  {EVENT_TYPE_ICONS[tmpl.event_type] || '📌'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-800 truncate">{name}</p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-zinc-500">
                    <Badge variant="secondary" className="text-[10px]">
                      {te(`type_${tmpl.event_type}`)}
                    </Badge>
                    {needsCount > 0 && (
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {needsCount} {t('teams')}
                      </span>
                    )}
                    {segmentsCount > 0 && (
                      <span className="flex items-center gap-1">
                        <ListOrdered className="h-3 w-3" />
                        {segmentsCount} {t('segments')}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Link href={`/admin/events/from-template?template=${tmpl.id}`}>
                    <Button variant="outline" size="sm">
                      <Copy className="h-3.5 w-3.5 me-1" />
                      {t('useTemplate')}
                    </Button>
                  </Link>
                  <Link href={`/admin/templates/${tmpl.id}/edit`}>
                    <Button variant="ghost" size="sm">
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
