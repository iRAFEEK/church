import { createClient } from '@/lib/supabase/server'
import { getCurrentUserWithRole } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { GroupForm } from '@/components/groups/GroupForm'

type Params = { params: Promise<{ id: string }> }

export default async function EditGroupPage({ params }: Params) {
  const { id } = await params
  const user = await getCurrentUserWithRole()
  if (!user) redirect('/login')
  if (!['ministry_leader', 'super_admin'].includes(user.profile.role)) redirect('/')

  const supabase = await createClient()

  const { data: group } = await supabase
    .from('groups')
    .select('*')
    .eq('id', id)
    .single()

  if (!group) notFound()

  const { data: ministries } = await supabase
    .from('ministries')
    .select('id,name,name_ar')
    .eq('is_active', true)
    .order('name')

  const { data: leaders } = await supabase
    .from('profiles')
    .select('id,first_name,last_name,first_name_ar,last_name_ar')
    .in('role', ['group_leader', 'ministry_leader', 'super_admin'])
    .eq('status', 'active')
    .order('first_name')

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">تعديل المجموعة</h1>
        <p className="text-sm text-zinc-500 mt-1">{group.name_ar || group.name}</p>
      </div>
      <GroupForm
        ministries={ministries || []}
        leaders={leaders || []}
        group={{
          id,
          name: group.name,
          name_ar: group.name_ar || '',
          type: group.type,
          ministry_id: group.ministry_id || '',
          leader_id: group.leader_id || '',
          co_leader_id: group.co_leader_id || '',
          meeting_day: group.meeting_day || '',
          meeting_time: group.meeting_time || '',
          meeting_location: group.meeting_location || '',
          meeting_location_ar: group.meeting_location_ar || '',
          meeting_frequency: group.meeting_frequency || 'weekly',
          max_members: group.max_members?.toString() || '',
          is_open: group.is_open,
        }}
      />
    </div>
  )
}
