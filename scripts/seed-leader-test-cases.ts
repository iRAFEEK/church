/**
 * Seed script: Creates test users for leader registration test cases
 *
 * Test Cases:
 *   1. brand-new@test.ekklesia.app       — does NOT exist anywhere (test fresh registration)
 *   2. member-to-promote@test.ekklesia.app — exists as a regular `member` (test promotion to group_leader)
 *   3. existing-leader@test.ekklesia.app   — exists as `group_leader` (test "already a leader" path)
 *   4. other-church@test.ekklesia.app      — exists in Supabase Auth under a DIFFERENT church (test 409 conflict)
 *
 * Usage: npx tsx scripts/seed-leader-test-cases.ts
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
  auth: { autoRefreshToken: false, persistSession: false },
})

const TEST_USERS = {
  // Case 1: Does NOT exist — skip seeding, just clean up if leftover
  brandNew: {
    email: 'brand-new@test.ekklesia.app',
    label: 'Case 1: Brand-new email (fresh registration)',
  },
  // Case 2: Existing member to promote
  memberToPromote: {
    email: 'member-to-promote@test.ekklesia.app',
    label: 'Case 2: Existing member (should be promoted)',
    firstName: 'Boutros',
    lastName: 'Khoury',
    firstNameAr: 'بطرس',
    lastNameAr: 'الخوري',
    phone: '+96170111222',
    role: 'member' as const,
  },
  // Case 3: Existing leader
  existingLeader: {
    email: 'existing-leader@test.ekklesia.app',
    label: 'Case 3: Existing group_leader (should return as-is)',
    firstName: 'Hanna',
    lastName: 'Elias',
    firstNameAr: 'حنا',
    lastNameAr: 'إلياس',
    phone: '+96170333444',
    role: 'group_leader' as const,
  },
  // Case 4: User in a different church
  otherChurch: {
    email: 'other-church@test.ekklesia.app',
    label: 'Case 4: Email in another church (should get 409)',
    firstName: 'Sami',
    lastName: 'Nasser',
    firstNameAr: 'سامي',
    lastNameAr: 'ناصر',
    phone: '+96170555666',
    role: 'member' as const,
  },
}

async function cleanupUser(email: string) {
  const { data: users } = await supabase.auth.admin.listUsers()
  const existing = users?.users?.find((u) => u.email === email)
  if (existing) {
    await supabase.from('profiles').delete().eq('id', existing.id)
    await supabase.auth.admin.deleteUser(existing.id)
    return true
  }
  return false
}

async function createTestUser(
  churchId: string,
  email: string,
  opts: {
    firstName: string
    lastName: string
    firstNameAr: string
    lastNameAr: string
    phone: string
    role: 'member' | 'group_leader'
  }
) {
  const password = 'TestPass123!'

  const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { church_id: churchId },
  })

  if (authErr || !authData.user) {
    throw new Error(`Auth create failed for ${email}: ${authErr?.message}`)
  }

  // Wait for trigger to create profile
  await new Promise((r) => setTimeout(r, 1500))

  const { error: updateErr } = await supabase
    .from('profiles')
    .update({
      first_name: opts.firstName,
      last_name: opts.lastName,
      first_name_ar: opts.firstNameAr,
      last_name_ar: opts.lastNameAr,
      phone: opts.phone,
      email,
      role: opts.role,
      status: 'active',
      church_id: churchId,
      onboarding_completed: true,
    })
    .eq('id', authData.user.id)

  if (updateErr) {
    throw new Error(`Profile update failed for ${email}: ${updateErr.message}`)
  }

  return authData.user.id
}

async function main() {
  console.log('🧪 Setting up leader registration test cases...\n')

  // Get the primary church
  const { data: church } = await supabase
    .from('churches')
    .select('id, name')
    .limit(1)
    .single()

  if (!church) {
    console.error('No church found. Run migrations and register a church first.')
    process.exit(1)
  }
  console.log(`Primary church: ${church.name} (${church.id})\n`)

  // ─── Case 1: Clean up brand-new email if it exists from a previous run ───
  console.log(`━━━ ${TEST_USERS.brandNew.label} ━━━`)
  const cleaned = await cleanupUser(TEST_USERS.brandNew.email)
  if (cleaned) {
    console.log(`  Cleaned up leftover user: ${TEST_USERS.brandNew.email}`)
  }
  console.log(`  ✅ ${TEST_USERS.brandNew.email} does NOT exist (ready for fresh registration)\n`)

  // ─── Case 2: Create a member to be promoted ───
  console.log(`━━━ ${TEST_USERS.memberToPromote.label} ━━━`)
  await cleanupUser(TEST_USERS.memberToPromote.email)
  const memberId = await createTestUser(church.id, TEST_USERS.memberToPromote.email, {
    firstName: TEST_USERS.memberToPromote.firstName!,
    lastName: TEST_USERS.memberToPromote.lastName!,
    firstNameAr: TEST_USERS.memberToPromote.firstNameAr!,
    lastNameAr: TEST_USERS.memberToPromote.lastNameAr!,
    phone: TEST_USERS.memberToPromote.phone!,
    role: 'member',
  })
  console.log(`  ✅ Created member: ${TEST_USERS.memberToPromote.email} (id: ${memberId})\n`)

  // ─── Case 3: Create an existing leader ───
  console.log(`━━━ ${TEST_USERS.existingLeader.label} ━━━`)
  await cleanupUser(TEST_USERS.existingLeader.email)
  const leaderId = await createTestUser(church.id, TEST_USERS.existingLeader.email, {
    firstName: TEST_USERS.existingLeader.firstName!,
    lastName: TEST_USERS.existingLeader.lastName!,
    firstNameAr: TEST_USERS.existingLeader.firstNameAr!,
    lastNameAr: TEST_USERS.existingLeader.lastNameAr!,
    phone: TEST_USERS.existingLeader.phone!,
    role: 'group_leader',
  })
  console.log(`  ✅ Created leader: ${TEST_USERS.existingLeader.email} (id: ${leaderId})\n`)

  // ─── Case 4: Create a user in a DIFFERENT church ───
  console.log(`━━━ ${TEST_USERS.otherChurch.label} ━━━`)
  await cleanupUser(TEST_USERS.otherChurch.email)

  // Create a second church for this test case
  const { data: otherChurch, error: churchErr } = await supabase
    .from('churches')
    .insert({
      name: 'Test Other Church',
      name_ar: 'كنيسة أخرى للاختبار',
      country: 'LB',
      timezone: 'Asia/Beirut',
      primary_language: 'ar',
    })
    .select('id')
    .single()

  if (churchErr || !otherChurch) {
    console.error('  ⚠️  Could not create second church:', churchErr?.message)
    console.log('  Skipping Case 4\n')
  } else {
    const otherUserId = await createTestUser(otherChurch.id, TEST_USERS.otherChurch.email, {
      firstName: TEST_USERS.otherChurch.firstName!,
      lastName: TEST_USERS.otherChurch.lastName!,
      firstNameAr: TEST_USERS.otherChurch.firstNameAr!,
      lastNameAr: TEST_USERS.otherChurch.lastNameAr!,
      phone: TEST_USERS.otherChurch.phone!,
      role: 'member',
    })
    console.log(`  ✅ Created user in other church: ${TEST_USERS.otherChurch.email} (id: ${otherUserId})`)
    console.log(`     Other church ID: ${otherChurch.id}\n`)
  }

  // ─── Summary ───
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('  TEST CASES READY')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('')
  console.log('  How to test (from the New Group form, Step 2 → "Register New Leader"):')
  console.log('')
  console.log('  Case 1 — Fresh registration:')
  console.log(`    Email: ${TEST_USERS.brandNew.email}`)
  console.log('    Name:  Any name you like')
  console.log('    Expected: Creates auth user + profile, toast "Leader registered", auto-selected')
  console.log('')
  console.log('  Case 2 — Promote existing member:')
  console.log(`    Email: ${TEST_USERS.memberToPromote.email}`)
  console.log('    Expected: Promotes to group_leader, toast "Existing member promoted"')
  console.log('')
  console.log('  Case 3 — Already a leader:')
  console.log(`    Email: ${TEST_USERS.existingLeader.email}`)
  console.log('    Expected: Returns existing, toast "This person is already a leader"')
  console.log('')
  console.log('  Case 4 — Email from another church:')
  console.log(`    Email: ${TEST_USERS.otherChurch.email}`)
  console.log('    Expected: 409 error, toast "This email is already registered in another church"')
  console.log('')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
}

main().catch(console.error)
