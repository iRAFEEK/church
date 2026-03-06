/**
 * Seed script: Creates a test visitor → converted member with dashboard data
 *
 * Usage: npx tsx scripts/seed-test-member.ts
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// Load .env.local
const envPath = resolve(process.cwd(), '.env.local')
const envContent = readFileSync(envPath, 'utf-8')
for (const line of envContent.split('\n')) {
  const match = line.match(/^([^#=]+)=(.*)$/)
  if (match) process.env[match[1].trim()] = match[2].trim()
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
})

const TEST_EMAIL = 'mariam.test@ekklesia.app'
const TEST_PASSWORD = 'TestMember123!'

async function main() {
  console.log('🔧 Setting up test member...\n')

  // 1. Get the church
  const { data: church } = await supabase
    .from('churches')
    .select('id, name')
    .limit(1)
    .single()

  if (!church) {
    console.error('No church found. Run migrations first.')
    process.exit(1)
  }
  console.log(`Church: ${church.name} (${church.id})`)

  // 2. Insert visitor record (simulating QR scan)
  const { data: visitor, error: visitorErr } = await supabase
    .from('visitors')
    .insert({
      church_id: church.id,
      first_name: 'Mariam',
      last_name: 'Hanna',
      first_name_ar: 'مريم',
      last_name_ar: 'حنا',
      phone: '+1234567890',
      email: TEST_EMAIL,
      age_range: '26_35',
      occupation: 'Teacher',
      how_heard: 'friend',
      status: 'new',
    })
    .select()
    .single()

  if (visitorErr) {
    console.error('Visitor insert error:', visitorErr.message)
    // Continue anyway — visitor may already exist
  } else {
    console.log(`Visitor created: ${visitor.first_name} ${visitor.last_name} (${visitor.id})`)
  }

  // 3. Create auth user (or get existing)
  let userId: string

  // Try to delete existing user first for clean state
  const { data: existingUsers } = await supabase.auth.admin.listUsers()
  const existing = existingUsers?.users?.find(u => u.email === TEST_EMAIL)
  if (existing) {
    // Delete profile first (cascade should handle it but just in case)
    await supabase.from('profiles').delete().eq('id', existing.id)
    await supabase.auth.admin.deleteUser(existing.id)
    console.log('Cleaned up existing test user')
  }

  const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
    email_confirm: true,
    user_metadata: { church_id: church.id }
  })

  if (authErr) {
    console.error('Auth user error:', authErr.message)
    process.exit(1)
  }

  userId = authData.user.id
  console.log(`Auth user created: ${userId}`)

  // 4. Wait a moment for the trigger to create the profile
  await new Promise(r => setTimeout(r, 1500))

  // 5. Update the profile with full details
  const { error: profileErr } = await supabase
    .from('profiles')
    .update({
      first_name: 'Mariam',
      last_name: 'Hanna',
      first_name_ar: 'مريم',
      last_name_ar: 'حنا',
      phone: '+1234567890',
      email: TEST_EMAIL,
      gender: 'female',
      date_of_birth: '1993-05-15',
      occupation: 'Teacher',
      occupation_ar: 'معلمة',
      role: 'member',
      status: 'active',
      joined_church_at: '2026-02-01',
      onboarding_completed: true,
      preferred_language: 'ar',
    })
    .eq('id', userId)

  if (profileErr) {
    console.error('Profile update error:', profileErr.message)
    // Try inserting instead
    const { error: insertErr } = await supabase.from('profiles').insert({
      id: userId,
      church_id: church.id,
      first_name: 'Mariam',
      last_name: 'Hanna',
      first_name_ar: 'مريم',
      last_name_ar: 'حنا',
      phone: '+1234567890',
      email: TEST_EMAIL,
      gender: 'female',
      date_of_birth: '1993-05-15',
      occupation: 'Teacher',
      occupation_ar: 'معلمة',
      role: 'member',
      status: 'active',
      joined_church_at: '2026-02-01',
      onboarding_completed: true,
      preferred_language: 'ar',
    })
    if (insertErr) {
      console.error('Profile insert error:', insertErr.message)
      process.exit(1)
    }
  }
  console.log('Profile updated with full details')

  // 6. Update visitor as converted
  if (visitor) {
    await supabase
      .from('visitors')
      .update({ status: 'converted', converted_to: userId, contacted_at: new Date().toISOString() })
      .eq('id', visitor.id)
    console.log('Visitor marked as converted')
  }

  // 7. Find or create a group and add member
  let groupId: string | null = null

  const { data: existingGroup } = await supabase
    .from('groups')
    .select('id, name')
    .eq('church_id', church.id)
    .limit(1)
    .single()

  if (existingGroup) {
    groupId = existingGroup.id
    console.log(`Using existing group: ${existingGroup.name}`)
  } else {
    // Get a leader to assign
    const { data: leader } = await supabase
      .from('profiles')
      .select('id')
      .eq('church_id', church.id)
      .in('role', ['group_leader', 'ministry_leader', 'super_admin'])
      .neq('id', userId)
      .limit(1)
      .single()

    if (leader) {
      const { data: newGroup } = await supabase
        .from('groups')
        .insert({
          church_id: church.id,
          name: 'Young Adults Fellowship',
          name_ar: 'شركة الشباب',
          description: 'A welcoming group for young adults to grow in faith together',
          description_ar: 'مجموعة ترحيبية للشباب للنمو في الإيمان معًا',
          type: 'small_group',
          meeting_day: 'friday',
          meeting_time: '19:00',
          meeting_frequency: 'weekly',
          location: 'Church Hall B',
          location_ar: 'قاعة الكنيسة ب',
          leader_id: leader.id,
          is_active: true,
        })
        .select()
        .single()

      if (newGroup) {
        groupId = newGroup.id
        console.log(`Created group: ${newGroup.name}`)
      }
    }
  }

  if (groupId) {
    // Add member to group
    const { error: gmErr } = await supabase
      .from('group_members')
      .insert({
        group_id: groupId,
        profile_id: userId,
        role: 'member',
        is_active: true,
      })
    if (gmErr && !gmErr.message.includes('duplicate')) {
      console.error('Group member error:', gmErr.message)
    } else {
      console.log('Added to group')
    }

    // 8. Create a gathering and attendance record
    const lastFriday = new Date()
    lastFriday.setDate(lastFriday.getDate() - ((lastFriday.getDay() + 2) % 7))
    lastFriday.setHours(19, 0, 0, 0)

    const { data: gathering } = await supabase
      .from('gatherings')
      .insert({
        group_id: groupId,
        scheduled_at: lastFriday.toISOString(),
        topic: 'The Good Samaritan',
        topic_ar: 'السامري الصالح',
        status: 'completed',
      })
      .select()
      .single()

    if (gathering) {
      await supabase.from('attendance').insert({
        gathering_id: gathering.id,
        profile_id: userId,
        status: 'present',
      })
      console.log('Created gathering + attendance record')
    }

    // Create upcoming gathering
    const nextFriday = new Date()
    nextFriday.setDate(nextFriday.getDate() + ((5 - nextFriday.getDay() + 7) % 7 || 7))
    nextFriday.setHours(19, 0, 0, 0)

    await supabase.from('gatherings').insert({
      group_id: groupId,
      scheduled_at: nextFriday.toISOString(),
      topic: 'Walking by Faith',
      topic_ar: 'السلوك بالإيمان',
      status: 'scheduled',
    })
    console.log('Created upcoming gathering')
  }

  // 9. Add milestones
  const { data: milestoneTypes } = await supabase
    .from('milestone_types')
    .select('id, name')
    .eq('church_id', church.id)
    .limit(2)

  if (milestoneTypes && milestoneTypes.length > 0) {
    for (const mt of milestoneTypes) {
      await supabase.from('profile_milestones').insert({
        profile_id: userId,
        milestone_type_id: mt.id,
        achieved_at: '2026-02-15',
      })
    }
    console.log(`Added ${milestoneTypes.length} milestone(s)`)
  }

  // 10. Create events
  const { data: existingEvent } = await supabase
    .from('events')
    .select('id')
    .eq('church_id', church.id)
    .eq('status', 'published')
    .gte('starts_at', new Date().toISOString())
    .limit(1)
    .single()

  if (!existingEvent) {
    const eventDate = new Date()
    eventDate.setDate(eventDate.getDate() + 10)
    eventDate.setHours(18, 0, 0, 0)

    const { data: newEvent } = await supabase
      .from('events')
      .insert({
        church_id: church.id,
        title: 'Easter Celebration Service',
        title_ar: 'خدمة احتفال عيد القيامة',
        description: 'Join us for a special Easter celebration with worship, prayer, and fellowship.',
        description_ar: 'انضموا إلينا لاحتفال خاص بعيد القيامة مع التسبيح والصلاة والشركة.',
        location: 'Main Sanctuary',
        location_ar: 'القاعة الرئيسية',
        starts_at: eventDate.toISOString(),
        ends_at: new Date(eventDate.getTime() + 3 * 60 * 60 * 1000).toISOString(),
        status: 'published',
        max_attendees: 200,
      })
      .select()
      .single()

    if (newEvent) {
      // Register the member
      await supabase.from('event_registrations').insert({
        event_id: newEvent.id,
        profile_id: userId,
      })
      console.log('Created event + registration')
    }
  } else {
    // Register for existing event
    await supabase.from('event_registrations').insert({
      event_id: existingEvent.id,
      profile_id: userId,
    }).then(() => console.log('Registered for existing event'))
  }

  // 11. Create announcements
  const { data: existingAnnouncement } = await supabase
    .from('announcements')
    .select('id')
    .eq('church_id', church.id)
    .eq('status', 'published')
    .limit(1)
    .single()

  if (!existingAnnouncement) {
    await supabase.from('announcements').insert([
      {
        church_id: church.id,
        title: 'Welcome New Members!',
        title_ar: 'مرحبًا بالأعضاء الجدد!',
        body: 'We are excited to welcome our newest members to the church family. Please make them feel at home!',
        body_ar: 'نحن متحمسون للترحيب بأحدث أعضائنا في عائلة الكنيسة. يرجى أن تجعلوهم يشعرون بأنهم في بيتهم!',
        status: 'published',
        is_pinned: true,
        published_at: new Date().toISOString(),
      },
      {
        church_id: church.id,
        title: 'Volunteer Opportunities Available',
        title_ar: 'فرص تطوع متاحة',
        body: 'We have several volunteer positions open in children\'s ministry and worship team. Contact the office for details.',
        body_ar: 'لدينا عدة مناصب تطوعية مفتوحة في خدمة الأطفال وفريق التسبيح. تواصلوا مع المكتب للتفاصيل.',
        status: 'published',
        is_pinned: false,
        published_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ])
    console.log('Created 2 announcements')
  }

  // 12. Create a notification
  await supabase.from('notifications_log').insert({
    church_id: church.id,
    recipient_id: userId,
    channel: 'in_app',
    title: 'Welcome to Ekklesia!',
    body: 'We\'re glad you\'re here. Check out your dashboard to get started.',
    status: 'delivered',
    read_at: null,
  })
  console.log('Created welcome notification')

  // Done!
  console.log('\n✅ Test member created successfully!\n')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`  Email:    ${TEST_EMAIL}`)
  console.log(`  Password: ${TEST_PASSWORD}`)
  console.log(`  Role:     member`)
  console.log(`  Name:     Mariam Hanna (مريم حنا)`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('\nLogin at http://localhost:3000/login to see the member portal.')
}

main().catch(console.error)
