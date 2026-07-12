import { createClient } from '@/lib/supabase/server'
import { requirePermission } from '@/lib/auth'
import Link from 'next/link'
import { VisitorQueue } from '@/components/visitors/VisitorQueue'
import { getTranslations } from 'next-intl/server'
import type { Visitor } from '@/types'
import { Users, UserPlus, UserCheck, AlertTriangle } from 'lucide-react'

export default async function AdminVisitorsPage() {
  const user = await requirePermission('can_view_visitors')

  const t = await getTranslations('visitors')
  const supabase = await createClient()

  // Get church SLA
  const slaHours = user.church.visitor_sla_hours || 48

  // Count helper: HEAD request, returns only the integer (no rows over the wire).
  const countByStatus = (status: string) =>
    supabase
      .from('visitors')
      .select('id', { count: 'exact', head: true })
      .eq('church_id', user.profile.church_id)
      .eq('status', status)

  // Parallelize: active visitors (bounded), pipeline counts, and leaders.
  const [visitorsResult, newCount, assignedCount, contactedCount, convertedCount, leadersResult] = await Promise.all([
    supabase
      .from('visitors')
      .select('id, church_id, first_name, last_name, first_name_ar, last_name_ar, phone, email, age_range, how_heard, occupation, visited_at, status, assigned_to, contacted_at, contact_notes, escalated_at, converted_to, created_at, updated_at, assigned_profile:assigned_to(id,first_name,last_name,first_name_ar,last_name_ar)')
      .eq('church_id', user.profile.church_id)
      .neq('status', 'converted')
      .order('visited_at', { ascending: false })
      // Bound the payload (PERF-2): the queue shows the newest actionable visitors;
      // anything older than the latest 200 is stale intake, not queue work.
      .limit(200),
    countByStatus('new'),
    countByStatus('assigned'),
    countByStatus('contacted'),
    countByStatus('converted'),
    supabase
      .from('profiles')
      .select('id,first_name,last_name,first_name_ar,last_name_ar')
      .eq('church_id', user.profile.church_id)
      .in('role', ['group_leader', 'ministry_leader', 'super_admin'])
      .eq('status', 'active')
      .order('first_name'),
  ])

  const visitors = (visitorsResult.data ?? []) as unknown as Visitor[]
  const leaders = leadersResult.data ?? []

  const now = Date.now()
  const slaMs = slaHours * 60 * 60 * 1000

  // Pipeline counts via HEAD count queries (PERF-3) — previously fetched one row
  // per visitor ever recorded just to count them client-side.
  const pipeline = {
    new: newCount.count ?? 0,
    assigned: assignedCount.count ?? 0,
    contacted: contactedCount.count ?? 0,
    converted: convertedCount.count ?? 0,
  }
  const pipelineTotal = pipeline.new + pipeline.assigned + pipeline.contacted + pipeline.converted

  // Stats for active visitors
  const stats = {
    total: visitors?.length || 0,
    new: visitors?.filter(v => v.status === 'new').length || 0,
    assigned: visitors?.filter(v => v.status === 'assigned').length || 0,
    overdue: visitors?.filter(v =>
      ['new', 'assigned'].includes(v.status) &&
      now - new Date(v.visited_at).getTime() > slaMs
    ).length || 0,
  }

  return (
    <div className="space-y-6 pb-24">
      {/* Header — wraps at 360px so the title and form link never collide */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-zinc-900">{t('adminPageTitle')}</h1>
          <p className="text-sm text-zinc-500 mt-1">{t('adminPageSubtitle')}</p>
        </div>
        <Link
          href="/join"
          target="_blank"
          className="shrink-0 text-sm text-zinc-600 border border-zinc-200 rounded-lg px-3 py-2 hover:bg-zinc-50 transition-colors"
        >
          {t('adminViewFormLink')}
        </Link>
      </div>

      {/* Pipeline Progress Bar */}
      {pipelineTotal > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-zinc-700">{t('pipelineTitle')}</p>
          <div className="flex h-3 rounded-full overflow-hidden bg-zinc-100">
            {pipeline.new > 0 && (
              <div className="bg-sky-500 transition-all" style={{ width: `${(pipeline.new / pipelineTotal) * 100}%` }} />
            )}
            {pipeline.assigned > 0 && (
              <div className="bg-amber-500 transition-all" style={{ width: `${(pipeline.assigned / pipelineTotal) * 100}%` }} />
            )}
            {pipeline.contacted > 0 && (
              <div className="bg-emerald-500 transition-all" style={{ width: `${(pipeline.contacted / pipelineTotal) * 100}%` }} />
            )}
            {pipeline.converted > 0 && (
              <div className="bg-zinc-400 transition-all" style={{ width: `${(pipeline.converted / pipelineTotal) * 100}%` }} />
            )}
          </div>
          <div className="flex justify-between text-xs text-zinc-500">
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-sky-500 inline-block" />
              {t('statusNew')} {pipeline.new}
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-amber-500 inline-block" />
              {t('statusAssigned')} {pipeline.assigned}
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block" />
              {t('statusContacted')} {pipeline.contacted}
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-zinc-400 inline-block" />
              {t('statusConverted')} {pipeline.converted}
            </span>
          </div>
        </div>
      )}

      {/* Overdue Alert */}
      {stats.overdue > 0 && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl p-3">
          <AlertTriangle className="h-5 w-5 text-red-600 shrink-0" />
          <p className="text-sm text-red-700">
            {t('overdueAlert', { count: stats.overdue, hours: slaHours })}
          </p>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard icon={Users} label={t('adminStatsTotal')} value={stats.total} />
        <StatCard icon={UserPlus} label={t('adminStatsNew')} value={stats.new} color="sky" />
        <StatCard icon={UserCheck} label={t('adminStatsAssigned')} value={stats.assigned} color="amber" />
        <StatCard icon={AlertTriangle} label={t('adminStatsOverdue')} value={stats.overdue} color="red" />
      </div>

      {/* Visitor Queue */}
      <VisitorQueue
        visitors={visitors || []}
        leaders={leaders || []}
        slaHours={slaHours}
      />
    </div>
  )
}

function StatCard({ label, value, color, icon: Icon }: { label: string; value: number; color?: string; icon: React.ComponentType<{ className?: string }> }) {
  const colorMap: Record<string, string> = {
    sky: 'text-sky-600 bg-sky-50',
    amber: 'text-amber-600 bg-amber-50',
    red: 'text-red-600 bg-red-50',
  }
  const cls = color ? colorMap[color] : 'text-zinc-900 bg-zinc-50'
  return (
    <div className={`rounded-xl p-4 ${cls}`}>
      <div className="flex items-center justify-between mb-2">
        <Icon className="h-5 w-5 opacity-60" />
      </div>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-sm mt-1 opacity-70">{label}</p>
    </div>
  )
}
