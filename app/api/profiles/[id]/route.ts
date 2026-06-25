import { NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { apiHandler } from '@/lib/api/handler'
import { validate } from '@/lib/api/validate'
import { UpdateProfileSchema } from '@/lib/schemas/profile'
import { canViewMemberPhone, type MemberDirectoryVisibility } from '@/lib/members/visibility'

// GET /api/profiles/[id]
export const GET = apiHandler(async ({ supabase, user, profile, params, resolvedPermissions }) => {
  const id = params!.id

  // Users can read own profile; admins can read any in church
  const isSelf = id === user.id
  const isAdmin = ['ministry_leader', 'super_admin'].includes(profile.role)

  if (!isSelf && !isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, first_name_ar, last_name_ar, email, phone, role, status, gender, photo_url, date_of_birth, occupation, occupation_ar, address, address_ar, city, city_ar, address_notes, notification_pref, preferred_language, preferred_bible_id, joined_church_at, onboarding_completed, church_id, created_at, updated_at')
    .eq('id', id)
    .eq('church_id', profile.church_id)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Per-church member-directory privacy (migration 081): an admin viewing ANOTHER
  // member's profile only sees phone if the church setting + their role allow it.
  // Viewing your own profile always shows your own phone.
  if (!isSelf) {
    const { data: church } = await supabase
      .from('churches')
      .select('member_directory_visibility')
      .eq('id', profile.church_id)
      .single()

    const visibility = (church?.member_directory_visibility ?? 'leaders_only') as MemberDirectoryVisibility
    if (!canViewMemberPhone(visibility, profile.role, resolvedPermissions.can_view_member_phone)) {
      const { phone: _phone, ...rest } = data
      return rest
    }
  }

  return data
})

// PATCH /api/profiles/[id]
export const PATCH = apiHandler(async ({ req, supabase, user, profile, params }) => {
  const id = params!.id

  const isSelf = id === user.id
  const isAdmin = ['ministry_leader', 'super_admin'].includes(profile.role)

  if (!isSelf && !isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const parsed = validate(UpdateProfileSchema, body)

  // Non-admins cannot change role
  if (!isAdmin && parsed.role) {
    delete parsed.role
  }

  const { data, error } = await supabase
    .from('profiles')
    .update(parsed)
    .eq('id', id)
    .eq('church_id', profile.church_id)
    .select('id, first_name, last_name, first_name_ar, last_name_ar, email, phone, role, status, gender, photo_url, date_of_birth, occupation, occupation_ar, address, address_ar, city, city_ar, address_notes, notification_pref, preferred_language, preferred_bible_id, joined_church_at, onboarding_completed, church_id, created_at, updated_at')
    .single()

  if (error) throw error

  revalidateTag(`dashboard-${profile.church_id}`)
  return data
})
