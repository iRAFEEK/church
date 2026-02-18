import { createClient } from '@/lib/supabase/server'
import { getCurrentUserWithRole } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { NewGatheringForm } from '@/components/gathering/NewGatheringForm'

type Params = { params: Promise<{ id: string }> }

export default async function NewGatheringPage({ params }: Params) {
  const { id: group_id } = await params
  const user = await getCurrentUserWithRole()
  if (!user) redirect('/login')

  const supabase = await createClient()

  const { data: group } = await supabase
    .from('groups')
    .select('id, name, name_ar, meeting_day, meeting_time, meeting_location, leader_id, co_leader_id')
    .eq('id', group_id)
    .single()

  if (!group) notFound()

  const isLeader = group.leader_id === user.profile.id || group.co_leader_id === user.profile.id
  const isAdmin = ['ministry_leader', 'super_admin'].includes(user.profile.role)
  if (!isLeader && !isAdmin) redirect('/')

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">اجتماع جديد</h1>
        <p className="text-sm text-zinc-500 mt-1">{group.name_ar || group.name}</p>
      </div>
      <NewGatheringForm group={group} />
    </div>
  )
}
