import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendNotification } from '@/lib/messaging/dispatcher'
import { logger } from '@/lib/logger'

type Params = { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: Params) {
  const { id: ministry_id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Check if user is a leader of this ministry or super_admin
  const { data: userProfile } = await supabase
    .from('profiles')
    .select('role, church_id')
    .eq('id', user.id)
    .single()

  if (!userProfile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  const isSuperAdmin = userProfile.role === 'super_admin'

  if (!isSuperAdmin) {
    const { data: membership } = await supabase
      .from('ministry_members')
      .select('role_in_ministry')
      .eq('ministry_id', ministry_id)
      .eq('profile_id', user.id)
      .eq('is_active', true)
      .single()

    if (!membership || membership.role_in_ministry !== 'leader') {
      return NextResponse.json({ error: 'Only ministry leaders can send notifications' }, { status: 403 })
    }
  }

  const { titleAr, titleEn, bodyAr, bodyEn } = await req.json()
  if (!titleAr && !titleEn) {
    return NextResponse.json({ error: 'Title is required' }, { status: 400 })
  }

  // Fetch all active ministry members
  const { data: members } = await supabase
    .from('ministry_members')
    .select('profile_id')
    .eq('ministry_id', ministry_id)
    .eq('is_active', true)

  if (!members || members.length === 0) {
    return NextResponse.json({ sent: 0, targets: 0 })
  }

  let sent = 0
  for (const member of members) {
    try {
      await sendNotification({
        profileId: member.profile_id,
        churchId: userProfile.church_id,
        type: 'general',
        titleEn: titleEn || titleAr,
        titleAr: titleAr || titleEn,
        bodyEn: bodyEn || bodyAr,
        bodyAr: bodyAr || bodyEn,
        referenceType: 'ministry',
        referenceId: ministry_id,
      })
      sent++
    } catch (error) {
      logger.error('Failed to notify ministry member', { module: 'ministries', churchId: userProfile.church_id, userId: member.profile_id, error })
    }
  }

  return NextResponse.json({ sent, targets: members.length })
}
