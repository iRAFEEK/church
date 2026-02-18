import { createClient } from '@/lib/supabase/server'
import { getCurrentUserWithRole } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { VisitorQueue } from '@/components/visitors/VisitorQueue'

export default async function AdminVisitorsPage() {
  const user = await getCurrentUserWithRole()
  if (!user) redirect('/login')
  if (!['ministry_leader', 'super_admin'].includes(user.profile.role)) redirect('/')

  const supabase = await createClient()

  // Get church SLA
  const slaHours = user.church.visitor_sla_hours || 48

  const { data: visitors } = await supabase
    .from('visitors')
    .select('*, assigned_profile:assigned_to(id,first_name,last_name,first_name_ar,last_name_ar)')
    .neq('status', 'converted')
    .order('visited_at', { ascending: false })

  // Get leaders for assignment dropdown
  const { data: leaders } = await supabase
    .from('profiles')
    .select('id,first_name,last_name,first_name_ar,last_name_ar')
    .in('role', ['group_leader', 'ministry_leader', 'super_admin'])
    .eq('status', 'active')
    .order('first_name')

  const now = Date.now()
  const slaMs = slaHours * 60 * 60 * 1000

  const stats = {
    total: visitors?.length || 0,
    new: visitors?.filter(v => v.status === 'new').length || 0,
    assigned: visitors?.filter(v => v.status === 'assigned').length || 0,
    contacted: visitors?.filter(v => v.status === 'contacted').length || 0,
    overdue: visitors?.filter(v =>
      ['new', 'assigned'].includes(v.status) &&
      now - new Date(v.visited_at).getTime() > slaMs
    ).length || 0,
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">قائمة الزوار</h1>
          <p className="text-sm text-zinc-500 mt-1">إدارة الزوار الجدد ومتابعتهم</p>
        </div>
        <Link
          href="/join"
          target="_blank"
          className="text-sm text-zinc-600 border border-zinc-200 rounded-lg px-3 py-2 hover:bg-zinc-50 transition-colors"
        >
          استعراض نموذج الزيارة
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="الإجمالي" value={stats.total} />
        <StatCard label="جدد" value={stats.new} color="blue" />
        <StatCard label="مُسنَدون" value={stats.assigned} color="yellow" />
        <StatCard label="متأخرون" value={stats.overdue} color="red" />
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

function StatCard({ label, value, color }: { label: string; value: number; color?: string }) {
  const colorMap: Record<string, string> = {
    blue: 'text-blue-600 bg-blue-50',
    yellow: 'text-yellow-600 bg-yellow-50',
    red: 'text-red-600 bg-red-50',
  }
  const cls = color ? colorMap[color] : 'text-zinc-900 bg-zinc-50'
  return (
    <div className={`rounded-xl p-4 ${cls}`}>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-sm mt-1 opacity-70">{label}</p>
    </div>
  )
}
