/**
 * Full seed: Creates a church, super_admin, group_leader, and 6 members
 * with realistic data so the leader dashboard is fully populated.
 *
 * Creates:
 *   - 1 Church: "Grace Community Church / كنيسة نعمة المجتمع"
 *   - 1 Super Admin (pastor@gracechurch.app / TestPass123!)
 *   - 1 Group Leader (leader@gracechurch.app / TestPass123!)
 *   - 6 Members — 4 in the group, 2 not in the group
 *   - 1 Ministry: "Youth Ministry"
 *   - 1 Group: "Young Adults Fellowship" (led by the group leader)
 *   - 4 Gatherings (3 completed + 1 upcoming) with attendance
 *   - 3 Prayer requests (2 active + 1 answered)
 *   - 2 Visitors assigned to the leader
 *   - 1 At-risk member (absent from recent gatherings)
 *   - 2 Announcements
 *   - 1 Upcoming event with registrations
 *
 * Usage: npx tsx scripts/seed-church-with-leader.ts
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// ─── Load .env.local ────────────────────────────────
const envPath = resolve(process.cwd(), '.env.local')
const envContent = readFileSync(envPath, 'utf-8')
for (const line of envContent.split('\n')) {
  const match = line.match(/^([^#=]+)=(.*)$/)
  if (match) process.env[match[1].trim()] = match[2].trim()
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const PASSWORD = 'TestPass123!'

// ─── Helpers ─────────────────────────────────────────

async function cleanupUser(email: string) {
  const { data: users } = await supabase.auth.admin.listUsers()
  const existing = users?.users?.find(u => u.email === email)
  if (existing) {
    await supabase.from('group_members').delete().eq('profile_id', existing.id)
    await supabase.from('attendance').delete().eq('profile_id', existing.id)
    await supabase.from('prayer_requests').delete().eq('submitted_by', existing.id)
    await supabase.from('profiles').delete().eq('id', existing.id)
    await supabase.auth.admin.deleteUser(existing.id)
    return true
  }
  return false
}

async function createUser(
  churchId: string,
  email: string,
  opts: {
    firstName: string; lastName: string
    firstNameAr: string; lastNameAr: string
    phone: string; role: string; gender: string
    dob?: string; occupation?: string; occupationAr?: string
  }
) {
  const { data: authData, error } = await supabase.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { church_id: churchId },
  })
  if (error || !authData.user) throw new Error(`Auth failed for ${email}: ${error?.message}`)

  await new Promise(r => setTimeout(r, 1200))

  await supabase.from('profiles').update({
    first_name: opts.firstName,
    last_name: opts.lastName,
    first_name_ar: opts.firstNameAr,
    last_name_ar: opts.lastNameAr,
    phone: opts.phone,
    email,
    role: opts.role,
    status: 'active',
    gender: opts.gender,
    date_of_birth: opts.dob || null,
    occupation: opts.occupation || null,
    occupation_ar: opts.occupationAr || null,
    church_id: churchId,
    onboarding_completed: true,
    joined_church_at: '2025-09-01',
    preferred_language: 'ar',
  }).eq('id', authData.user.id)

  return authData.user.id
}

function daysAgo(n: number): Date {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d
}

function daysFromNow(n: number): Date {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return d
}

// ─── Main ────────────────────────────────────────────

async function main() {
  console.log('🏗️  Setting up full church with leader dashboard data...\n')

  // ─── 1. Create Church ──────────────────────────────
  const { data: church, error: churchErr } = await supabase
    .from('churches')
    .insert({
      name: 'Grace Community Church',
      name_ar: 'كنيسة نعمة المجتمع',
      country: 'LB',
      timezone: 'Asia/Beirut',
      primary_language: 'ar',
      welcome_message_ar: 'مرحباً بكم في كنيسة نعمة المجتمع! نحن سعداء بزيارتكم.',
      welcome_message: 'Welcome to Grace Community Church! We are glad you are here.',
      visitor_sla_hours: 48,
    })
    .select('id')
    .single()

  if (churchErr || !church) {
    console.error('Church creation failed:', churchErr?.message)
    process.exit(1)
  }
  const churchId = church.id
  console.log(`✅ Church created: ${churchId}`)

  // ─── 2. Create Super Admin ─────────────────────────
  const adminEmail = 'pastor@gracechurch.app'
  await cleanupUser(adminEmail)
  const adminId = await createUser(churchId, adminEmail, {
    firstName: 'George', lastName: 'Haddad',
    firstNameAr: 'جورج', lastNameAr: 'حداد',
    phone: '+96170100100', role: 'super_admin', gender: 'male',
    dob: '1975-03-12', occupation: 'Pastor', occupationAr: 'راعي',
  })
  console.log(`✅ Super Admin: ${adminEmail} (${adminId})`)

  // ─── 3. Create Group Leader ────────────────────────
  const leaderEmail = 'leader@gracechurch.app'
  await cleanupUser(leaderEmail)
  const leaderId = await createUser(churchId, leaderEmail, {
    firstName: 'Nabil', lastName: 'Khoury',
    firstNameAr: 'نبيل', lastNameAr: 'الخوري',
    phone: '+96170200200', role: 'group_leader', gender: 'male',
    dob: '1990-07-22', occupation: 'Engineer', occupationAr: 'مهندس',
  })
  console.log(`✅ Group Leader: ${leaderEmail} (${leaderId})`)

  // ─── 4. Create 6 Members ──────────────────────────
  const members = [
    { email: 'sara@gracechurch.app', fn: 'Sara', ln: 'Mansour', fnAr: 'سارة', lnAr: 'منصور', phone: '+96170301301', gender: 'female', dob: '1995-02-14', occ: 'Teacher', occAr: 'معلمة', inGroup: true },
    { email: 'elias@gracechurch.app', fn: 'Elias', ln: 'Abi Nader', fnAr: 'إلياس', lnAr: 'أبي نادر', phone: '+96170302302', gender: 'male', dob: '1992-11-05', occ: 'Accountant', occAr: 'محاسب', inGroup: true },
    { email: 'maya@gracechurch.app', fn: 'Maya', ln: 'Farah', fnAr: 'مايا', lnAr: 'فرح', phone: '+96170303303', gender: 'female', dob: '1998-06-30', occ: 'Student', occAr: 'طالبة', inGroup: true },
    { email: 'tony@gracechurch.app', fn: 'Tony', ln: 'Saba', fnAr: 'طوني', lnAr: 'صبا', phone: '+96170304304', gender: 'male', dob: '1988-09-18', occ: 'Designer', occAr: 'مصمم', inGroup: true, atRisk: true },
    { email: 'rima@gracechurch.app', fn: 'Rima', ln: 'Tannous', fnAr: 'ريما', lnAr: 'طنوس', phone: '+96170305305', gender: 'female', dob: '1993-04-02', occ: 'Nurse', occAr: 'ممرضة', inGroup: false },
    { email: 'fadi@gracechurch.app', fn: 'Fadi', ln: 'Gerges', fnAr: 'فادي', lnAr: 'جرجس', phone: '+96170306306', gender: 'male', dob: '1985-12-25', occ: 'Doctor', occAr: 'طبيب', inGroup: false },
  ]

  const memberIds: Record<string, string> = {}
  for (const m of members) {
    await cleanupUser(m.email)
    const id = await createUser(churchId, m.email, {
      firstName: m.fn, lastName: m.ln,
      firstNameAr: m.fnAr, lastNameAr: m.lnAr,
      phone: m.phone, role: 'member', gender: m.gender,
      dob: m.dob, occupation: m.occ, occupationAr: m.occAr,
    })
    memberIds[m.email] = id
    console.log(`✅ Member: ${m.fn} ${m.ln} (${m.email})${m.inGroup ? ' [in group]' : ''}${m.atRisk ? ' [at-risk]' : ''}`)
  }

  // Mark Tony as at-risk
  const tonyId = memberIds['tony@gracechurch.app']
  await supabase.from('profiles').update({ status: 'at_risk' }).eq('id', tonyId)

  // ─── 5. Create Ministry ────────────────────────────
  const { data: ministry } = await supabase
    .from('ministries')
    .insert({
      church_id: churchId,
      name: 'Youth Ministry',
      name_ar: 'خدمة الشباب',
      leader_id: adminId,
      description: 'Ministry focused on young adults and college students',
      description_ar: 'خدمة تركز على الشباب وطلاب الجامعات',
      is_active: true,
    })
    .select('id')
    .single()
  console.log(`✅ Ministry: Youth Ministry (${ministry?.id})`)

  // ─── 6. Create Group ──────────────────────────────
  const { data: group } = await supabase
    .from('groups')
    .insert({
      church_id: churchId,
      ministry_id: ministry?.id || null,
      name: 'Young Adults Fellowship',
      name_ar: 'شركة الشباب',
      type: 'small_group',
      leader_id: leaderId,
      meeting_day: 'friday',
      meeting_time: '19:00',
      meeting_location: 'Church Hall B',
      meeting_location_ar: 'قاعة الكنيسة ب',
      meeting_frequency: 'weekly',
      max_members: 12,
      is_open: true,
      is_active: true,
    })
    .select('id')
    .single()

  if (!group) { console.error('Group creation failed'); process.exit(1) }
  const groupId = group.id
  console.log(`✅ Group: Young Adults Fellowship (${groupId})`)

  // ─── 7. Add Members to Group ──────────────────────
  // Leader as group member
  await supabase.from('group_members').insert({
    group_id: groupId, profile_id: leaderId, church_id: churchId,
    role_in_group: 'leader', is_active: true,
  })

  // 4 regular members
  const inGroupMembers = members.filter(m => m.inGroup)
  for (const m of inGroupMembers) {
    await supabase.from('group_members').insert({
      group_id: groupId, profile_id: memberIds[m.email], church_id: churchId,
      role_in_group: 'member', is_active: true,
    })
  }
  console.log(`✅ Added ${inGroupMembers.length + 1} people to group (leader + 4 members)`)

  // ─── 8. Create Gatherings + Attendance ────────────
  // 3 completed gatherings (3 weeks ago, 2 weeks ago, last week)
  const gatheringData = [
    { daysAgo: 21, topic: 'The Good Samaritan', topicAr: 'السامري الصالح' },
    { daysAgo: 14, topic: 'Walking by Faith', topicAr: 'السلوك بالإيمان' },
    { daysAgo: 7,  topic: 'Love Your Neighbor', topicAr: 'أحبب قريبك' },
  ]

  // Attendance patterns: Sara=always present, Elias=always present, Maya=mostly present, Tony=absent (at-risk)
  const attendancePatterns: Record<string, ('present' | 'absent' | 'late' | 'excused')[]> = {
    [leaderId]:                        ['present', 'present', 'present'],
    [memberIds['sara@gracechurch.app']]:  ['present', 'present', 'present'],
    [memberIds['elias@gracechurch.app']]: ['present', 'late',    'present'],
    [memberIds['maya@gracechurch.app']]:  ['present', 'excused', 'present'],
    [memberIds['tony@gracechurch.app']]:  ['absent',  'absent',  'absent'],
  }

  const gatheringIds: string[] = []
  for (let i = 0; i < gatheringData.length; i++) {
    const g = gatheringData[i]
    const scheduledAt = daysAgo(g.daysAgo)
    scheduledAt.setHours(19, 0, 0, 0)

    const { data: gathering } = await supabase
      .from('gatherings')
      .insert({
        group_id: groupId,
        church_id: churchId,
        scheduled_at: scheduledAt.toISOString(),
        topic: g.topic,
        topic_ar: g.topicAr,
        status: 'completed',
      })
      .select('id')
      .single()

    if (!gathering) continue
    gatheringIds.push(gathering.id)

    // Insert attendance for each member
    for (const [profileId, statuses] of Object.entries(attendancePatterns)) {
      await supabase.from('attendance').insert({
        gathering_id: gathering.id,
        group_id: groupId,
        profile_id: profileId,
        church_id: churchId,
        status: statuses[i],
        marked_by: leaderId,
      })
    }
  }
  console.log(`✅ Created 3 completed gatherings with attendance`)

  // 1 upcoming gathering (next Friday)
  const nextFriday = daysFromNow((5 - new Date().getDay() + 7) % 7 || 7)
  nextFriday.setHours(19, 0, 0, 0)

  await supabase.from('gatherings').insert({
    group_id: groupId,
    church_id: churchId,
    scheduled_at: nextFriday.toISOString(),
    topic: 'Bearing Fruit',
    topic_ar: 'حمل الثمار',
    status: 'scheduled',
  })
  console.log(`✅ Created 1 upcoming gathering (${nextFriday.toDateString()})`)

  // ─── 9. Create Prayer Requests ────────────────────
  await supabase.from('prayer_requests').insert([
    {
      group_id: groupId, church_id: churchId,
      submitted_by: memberIds['sara@gracechurch.app'],
      content: 'Please pray for my mother who is having surgery next week. She is nervous but trusting God.',
      is_private: false, status: 'active',
    },
    {
      group_id: groupId, church_id: churchId,
      submitted_by: memberIds['elias@gracechurch.app'],
      content: 'Pray for my job interview on Thursday. I really need this opportunity.',
      is_private: false, status: 'active',
    },
    {
      group_id: groupId, church_id: churchId,
      submitted_by: memberIds['maya@gracechurch.app'],
      content: 'Thank God — my exam results came back and I passed!',
      is_private: false, status: 'answered',
      resolved_at: new Date().toISOString(),
      resolved_notes: 'Praise God for this answered prayer!',
    },
  ])
  console.log(`✅ Created 3 prayer requests (2 active + 1 answered)`)

  // ─── 10. Create Visitors Assigned to Leader ───────
  await supabase.from('visitors').insert([
    {
      church_id: churchId,
      first_name: 'Ahmad', last_name: 'Saleh',
      first_name_ar: 'أحمد', last_name_ar: 'صالح',
      phone: '+96170400400', email: 'ahmad.visitor@gmail.com',
      age_range: '26_35', how_heard: 'friend',
      status: 'assigned', assigned_to: leaderId,
      visited_at: daysAgo(3).toISOString(),
    },
    {
      church_id: churchId,
      first_name: 'Lara', last_name: 'Hanna',
      first_name_ar: 'لارا', last_name_ar: 'حنا',
      phone: '+96170400401',
      age_range: '18_25', how_heard: 'social_media',
      status: 'assigned', assigned_to: leaderId,
      visited_at: daysAgo(1).toISOString(),
    },
  ])
  console.log(`✅ Created 2 visitors assigned to leader`)

  // ─── 11. Create Announcements ─────────────────────
  await supabase.from('announcements').insert([
    {
      church_id: churchId,
      title: 'Easter Retreat Registration Open',
      title_ar: 'التسجيل مفتوح لخلوة عيد القيامة',
      body: 'Join us for our annual Easter retreat April 18-20. Register at the church office or online.',
      body_ar: 'انضموا إلينا لخلوتنا السنوية بمناسبة عيد القيامة ١٨-٢٠ نيسان. سجّلوا في مكتب الكنيسة أو عبر الإنترنت.',
      status: 'published', is_pinned: true,
      published_at: daysAgo(2).toISOString(),
    },
    {
      church_id: churchId,
      title: 'New Serving Opportunities',
      title_ar: 'فرص خدمة جديدة',
      body: 'We need volunteers for children\'s ministry and the worship team. Contact the office for details.',
      body_ar: 'نحتاج متطوعين لخدمة الأطفال وفريق التسبيح. تواصلوا مع المكتب للتفاصيل.',
      status: 'published', is_pinned: false,
      published_at: daysAgo(5).toISOString(),
    },
  ])
  console.log(`✅ Created 2 announcements`)

  // ─── 12. Create Event + Registrations ─────────────
  const eventDate = daysFromNow(12)
  eventDate.setHours(18, 0, 0, 0)

  const { data: event } = await supabase
    .from('events')
    .insert({
      church_id: churchId,
      created_by: adminId,
      title: 'Easter Celebration Service',
      title_ar: 'خدمة احتفال عيد القيامة',
      description: 'A special Easter service with worship, communion, and fellowship dinner.',
      description_ar: 'خدمة خاصة بعيد القيامة مع تسبيح وعشاء الرب وعشاء محبة.',
      event_type: 'service',
      starts_at: eventDate.toISOString(),
      ends_at: new Date(eventDate.getTime() + 3 * 60 * 60 * 1000).toISOString(),
      location: 'Main Sanctuary',
      capacity: 200,
      is_public: true,
      registration_required: true,
      status: 'published',
    })
    .select('id')
    .single()

  if (event) {
    // Register a few members
    await supabase.from('event_registrations').insert([
      { event_id: event.id, church_id: churchId, profile_id: leaderId, name: 'Nabil Khoury' },
      { event_id: event.id, church_id: churchId, profile_id: memberIds['sara@gracechurch.app'], name: 'Sara Mansour' },
      { event_id: event.id, church_id: churchId, profile_id: memberIds['elias@gracechurch.app'], name: 'Elias Abi Nader' },
    ])
    console.log(`✅ Created event with 3 registrations`)
  }

  // ─── 13. Create Notifications for Leader ──────────
  await supabase.from('notifications_log').insert([
    {
      church_id: churchId, profile_id: leaderId,
      type: 'visitor_assigned', channel: 'in_app',
      title: 'New Visitor Assigned', body: 'Ahmad Saleh has been assigned to you for follow-up.',
      status: 'delivered',
    },
    {
      church_id: churchId, profile_id: leaderId,
      type: 'visitor_assigned', channel: 'in_app',
      title: 'New Visitor Assigned', body: 'Lara Hanna has been assigned to you for follow-up.',
      status: 'delivered',
    },
    {
      church_id: churchId, profile_id: leaderId,
      type: 'at_risk_alert', channel: 'in_app',
      title: 'At-Risk Member Alert', body: 'Tony Saba has been absent for 3 consecutive weeks.',
      status: 'delivered',
    },
  ])
  console.log(`✅ Created 3 notifications for leader`)

  // ─── 14. Verify Login Works ────────────────────────
  console.log('\n🔐 Verifying login credentials...')

  // Use the anon key (same as browser client) to test signInWithPassword
  const { createClient: createAnonClient } = await import('@supabase/supabase-js')
  const anonClient = createAnonClient(SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data: adminLogin, error: adminLoginErr } = await anonClient.auth.signInWithPassword({
    email: adminEmail,
    password: PASSWORD,
  })
  if (adminLoginErr) {
    console.error(`   ❌ Admin login FAILED: ${adminLoginErr.message}`)
  } else {
    console.log(`   ✅ Admin login OK (user ID: ${adminLogin.user?.id})`)
  }

  const { data: leaderLogin, error: leaderLoginErr } = await anonClient.auth.signInWithPassword({
    email: leaderEmail,
    password: PASSWORD,
  })
  if (leaderLoginErr) {
    console.error(`   ❌ Leader login FAILED: ${leaderLoginErr.message}`)
  } else {
    console.log(`   ✅ Leader login OK (user ID: ${leaderLogin.user?.id})`)
  }

  // Also verify the profile exists and has the right church_id
  const { data: adminProfile } = await supabase
    .from('profiles')
    .select('id, church_id, role, onboarding_completed, email')
    .eq('id', adminId)
    .single()
  console.log(`   Admin profile: role=${adminProfile?.role}, church=${adminProfile?.church_id}, onboarding=${adminProfile?.onboarding_completed}, email=${adminProfile?.email}`)

  const { data: leaderProfile } = await supabase
    .from('profiles')
    .select('id, church_id, role, onboarding_completed, email')
    .eq('id', leaderId)
    .single()
  console.log(`   Leader profile: role=${leaderProfile?.role}, church=${leaderProfile?.church_id}, onboarding=${leaderProfile?.onboarding_completed}, email=${leaderProfile?.email}`)

  // ─── Summary ──────────────────────────────────────
  console.log('\n' + '═'.repeat(55))
  console.log('  SEED COMPLETE — Login Credentials')
  console.log('═'.repeat(55))
  console.log('')
  console.log('  🔑 Super Admin (full admin dashboard):')
  console.log(`     Email:    ${adminEmail}`)
  console.log(`     Password: ${PASSWORD}`)
  console.log('')
  console.log('  🔑 Group Leader (leader dashboard):')
  console.log(`     Email:    ${leaderEmail}`)
  console.log(`     Password: ${PASSWORD}`)
  console.log('')
  console.log('  👥 Members (member dashboard):')
  for (const m of members) {
    const tag = m.inGroup ? (m.atRisk ? '⚠️  at-risk' : '✓ in group') : '— not in group'
    console.log(`     ${m.fn.padEnd(6)} ${m.ln.padEnd(12)} ${m.email.padEnd(30)} ${tag}`)
  }
  console.log(`     Password for all: ${PASSWORD}`)
  console.log('')
  console.log('  📊 Leader Dashboard will show:')
  console.log('     • 5 group members (leader + 4)')
  console.log('     • ~80% attendance rate (3 weeks of data)')
  console.log('     • 1 at-risk member (Tony Saba — 3 weeks absent)')
  console.log('     • 2 active prayer requests')
  console.log('     • 2 assigned visitors')
  console.log('     • 3 recent completed gatherings')
  console.log('     • 1 upcoming gathering')
  console.log('     • 3 unread notifications')
  console.log('')
  console.log('═'.repeat(55))
  console.log(`  Login at http://localhost:3000/login`)
  console.log('═'.repeat(55))
}

main().catch(err => {
  console.error('\n❌ Seed failed:', err.message || err)
  process.exit(1)
})
