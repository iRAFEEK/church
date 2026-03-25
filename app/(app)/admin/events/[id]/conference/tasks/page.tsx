import { getCurrentUserWithRole } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { getTranslations, getLocale } from 'next-intl/server'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { CheckSquare } from 'lucide-react'
import Link from 'next/link'

interface SearchParams {
  team?: string
  status?: string
  priority?: string
  page?: string
}

const PAGE_SIZE = 25

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-zinc-100 text-zinc-700',
  in_progress: 'bg-amber-100 text-amber-700',
  blocked: 'bg-red-100 text-red-700',
  done: 'bg-green-100 text-green-700',
}

const PRIORITY_COLORS: Record<string, string> = {
  low: 'bg-zinc-100 text-zinc-500',
  normal: 'bg-blue-100 text-blue-700',
  high: 'bg-amber-100 text-amber-700',
  critical: 'bg-red-100 text-red-700',
}

export default async function TasksPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<SearchParams>
}) {
  const { id } = await params
  const sp = await searchParams
  const user = await getCurrentUserWithRole()

  if (!user.resolvedPermissions.can_manage_events) redirect('/dashboard')

  const t = await getTranslations('conference')
  const locale = await getLocale()
  const isRTL = locale.startsWith('ar')
  const supabase = await createClient()

  const page = parseInt(sp.page || '1')
  const offset = (page - 1) * PAGE_SIZE

  const { data: event } = await supabase
    .from('events')
    .select('id')
    .eq('id', id)
    .eq('church_id', user.profile.church_id)
    .single()

  if (!event) notFound()

  let tasksQuery = supabase
    .from('conference_tasks')
    .select(
      'id, title, status, priority, due_at, team_id, assigned_to, team:team_id(id, name, name_ar), assignee:assigned_to(id, first_name, last_name, first_name_ar, last_name_ar)',
      { count: 'exact' }
    )
    .eq('event_id', id)
    .eq('church_id', user.profile.church_id)
    .order('priority', { ascending: false })
    .order('created_at', { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1)

  if (sp.team) tasksQuery = tasksQuery.eq('team_id', sp.team)
  if (sp.status) tasksQuery = tasksQuery.eq('status', sp.status)
  if (sp.priority) tasksQuery = tasksQuery.eq('priority', sp.priority)

  const { data: tasks, count } = await tasksQuery

  const totalPages = Math.ceil((count || 0) / PAGE_SIZE)

  type TaskRow = {
    id: string
    title: string
    status: string
    priority: string
    due_at: string | null
    team: { id: string; name: string; name_ar: string | null } | null
    assignee: { first_name: string; last_name: string; first_name_ar?: string | null; last_name_ar?: string | null } | null
  }

  const getAssigneeName = (assignee: TaskRow['assignee']) => {
    if (!assignee) return '—'
    if (isRTL && (assignee.first_name_ar || assignee.last_name_ar)) {
      return `${assignee.first_name_ar || ''} ${assignee.last_name_ar || ''}`.trim()
    }
    return `${assignee.first_name} ${assignee.last_name}`.trim()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{t('tasks')}</h2>
        <span className="text-sm text-muted-foreground" dir="ltr">{count ?? 0}</span>
      </div>

      {/* Status filter */}
      <div className="flex gap-2 flex-wrap">
        {(['open', 'in_progress', 'blocked', 'done'] as const).map((s) => (
          <Link key={s} href={`?status=${s}`}>
            <Badge
              variant={sp.status === s ? 'default' : 'outline'}
              className={`cursor-pointer h-9 px-3 text-sm ${sp.status !== s ? STATUS_COLORS[s] : ''}`}
            >
              {t(s === 'open' ? 'taskOpen' : s === 'in_progress' ? 'taskInProgress' : s === 'blocked' ? 'taskBlocked' : 'taskDone')}
            </Badge>
          </Link>
        ))}
      </div>

      {/* Empty state */}
      {(!tasks || tasks.length === 0) && (
        <Card>
          <CardContent className="py-16 text-center">
            <CheckSquare className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-40" />
            <p className="font-medium text-muted-foreground">{t('emptyTasks')}</p>
            <p className="text-sm text-muted-foreground mt-1">{t('emptyTasksDesc')}</p>
          </CardContent>
        </Card>
      )}

      {tasks && tasks.length > 0 && (
        <>
          {/* Desktop table */}
          <div className="hidden md:block rounded-xl border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="text-start px-4 py-3 font-medium">{t('taskTitle')}</th>
                  <th className="text-start px-4 py-3 font-medium">{t('assignee')}</th>
                  <th className="text-start px-4 py-3 font-medium">{t('team')}</th>
                  <th className="text-start px-4 py-3 font-medium">{t('priority')}</th>
                  <th className="text-start px-4 py-3 font-medium">{isRTL ? 'الحالة' : 'Status'}</th>
                  <th className="text-start px-4 py-3 font-medium">{t('dueDate')}</th>
                </tr>
              </thead>
              <tbody>
                {(tasks as unknown as TaskRow[]).map((task) => (
                  <tr key={task.id} className="border-b last:border-0 hover:bg-muted/20">
                    <td className="px-4 py-3 font-medium">{task.title}</td>
                    <td className="px-4 py-3 text-muted-foreground">{getAssigneeName(task.assignee)}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {task.team ? (isRTL ? (task.team.name_ar || task.team.name) : task.team.name) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={`text-xs ${PRIORITY_COLORS[task.priority] || ''}`}>
                        {t(task.priority === 'low' ? 'priorityLow' : task.priority === 'normal' ? 'priorityNormal' : task.priority === 'high' ? 'priorityHigh' : 'priorityCritical')}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={`text-xs ${STATUS_COLORS[task.status] || ''}`}>
                        {t(task.status === 'open' ? 'taskOpen' : task.status === 'in_progress' ? 'taskInProgress' : task.status === 'blocked' ? 'taskBlocked' : 'taskDone')}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs" dir="ltr">
                      {task.due_at ? new Date(task.due_at).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-2">
            {(tasks as unknown as TaskRow[]).map((task) => (
              <div key={task.id} className="rounded-xl border bg-card p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium text-sm">{task.title}</p>
                  <Badge className={`text-xs shrink-0 ${STATUS_COLORS[task.status] || ''}`}>
                    {t(task.status === 'open' ? 'taskOpen' : task.status === 'in_progress' ? 'taskInProgress' : task.status === 'blocked' ? 'taskBlocked' : 'taskDone')}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {task.team && <span>{isRTL ? (task.team.name_ar || task.team.name) : task.team.name}</span>}
                  <Badge className={`text-xs ${PRIORITY_COLORS[task.priority] || ''}`}>
                    {t(task.priority === 'low' ? 'priorityLow' : task.priority === 'normal' ? 'priorityNormal' : task.priority === 'high' ? 'priorityHigh' : 'priorityCritical')}
                  </Badge>
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center gap-2">
              {page > 1 && (
                <Button variant="outline" size="sm" asChild>
                  <Link href={`?${new URLSearchParams({ ...sp, page: String(page - 1) })}`}>←</Link>
                </Button>
              )}
              <span className="text-sm text-muted-foreground self-center" dir="ltr">{page} / {totalPages}</span>
              {page < totalPages && (
                <Button variant="outline" size="sm" asChild>
                  <Link href={`?${new URLSearchParams({ ...sp, page: String(page + 1) })}`}>→</Link>
                </Button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
