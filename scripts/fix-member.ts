import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const envPath = resolve(process.cwd(), '.env.local')
const envContent = readFileSync(envPath, 'utf-8')
for (const line of envContent.split('\n')) {
  const match = line.match(/^([^#=]+)=(.*)$/)
  if (match) process.env[match[1].trim()] = match[2].trim()
}

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

const PROFILE_ID = 'c1d6aad8-c9ab-4b4f-a40b-997427c7d040'

async function main() {
  const { data: church } = await sb.from('churches').select('id').limit(1).single()
  const churchId = church!.id

  const { data: group } = await sb.from('groups').select('id, name').eq('church_id', churchId).limit(1).single()
  if (!group) { console.log('No group'); return }
  console.log('Group:', group.name, group.id)

  // Get the gathering we created (or the upcoming one)
  const { data: gatherings } = await sb.from('gatherings')
    .select('id, status, scheduled_at')
    .eq('group_id', group.id)
    .eq('status', 'completed')
    .order('scheduled_at', { ascending: false })
    .limit(1)

  if (gatherings && gatherings.length > 0) {
    const g = gatherings[0]
    console.log('Found completed gathering:', g.id)

    // Add attendance with all required fields
    const { error: aErr } = await sb.from('attendance').insert({
      gathering_id: g.id,
      group_id: group.id,
      profile_id: PROFILE_ID,
      church_id: churchId,
      status: 'present',
    })
    console.log(aErr ? 'Attendance: ' + aErr.message : 'Attendance recorded!')
  } else {
    // Create a completed gathering first
    const lastFri = new Date()
    lastFri.setDate(lastFri.getDate() - ((lastFri.getDay() + 2) % 7))
    lastFri.setHours(19, 0, 0, 0)

    const { data: g, error: gErr } = await sb.from('gatherings').insert({
      group_id: group.id,
      church_id: churchId,
      scheduled_at: lastFri.toISOString(),
      topic: 'The Good Samaritan',
      topic_ar: 'السامري الصالح',
      status: 'completed',
    }).select().single()

    if (gErr) {
      console.log('Gathering error:', gErr.message)
    } else {
      const { error: aErr } = await sb.from('attendance').insert({
        gathering_id: g.id,
        group_id: group.id,
        profile_id: PROFILE_ID,
        church_id: churchId,
        status: 'present',
      })
      console.log(aErr ? 'Attendance: ' + aErr.message : 'Created gathering + attendance!')
    }
  }

  console.log('\nDone!')
}

main().catch(console.error)
