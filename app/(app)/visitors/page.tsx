import { createClient } from '@/lib/supabase/server'
import { getCurrentUserWithRole } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { LeaderVisitorList } from '@/components/visitors/LeaderVisitorList'

export default async function LeaderVisitorsPage() {
  const user = await getCurrentUserWithRole()
  if (!user) redirect('/login')

  const supabase = await createClient()

  const { data: visitors } = await supabase
    .from('visitors')
    .select('*')
    .eq('assigned_to', user.profile.id)
    .neq('status', 'converted')
    .order('visited_at', { ascending: false })

  const slaHours = user.church.visitor_sla_hours || 48

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">زواري المُسنَدون</h1>
        <p className="text-sm text-zinc-500 mt-1">الزوار المُعيَّنون لك للمتابعة</p>
      </div>

      <LeaderVisitorList visitors={visitors || []} slaHours={slaHours} />
    </div>
  )
}
