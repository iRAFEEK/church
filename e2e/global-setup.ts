import { Client } from 'pg'
import { config as loadEnv } from 'dotenv'
import path from 'node:path'

/**
 * Idempotent e2e reset — runs once before the suite so the MUTATING journeys
 * (onboarding completion, event RSVP, serving signup) can re-run cleanly instead
 * of failing on their own leftover state (a completed account, a duplicate RSVP).
 *
 * Uses DATABASE_URL from .env.local (a service-role connection). It is a no-op if
 * DATABASE_URL is unset, so the suite still runs (those specs just skip / may be
 * order-sensitive) without it.
 */
export default async function globalSetup() {
  loadEnv({ path: path.resolve(process.cwd(), '.env.local') })
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    // eslint-disable-next-line no-console
    console.warn('[e2e globalSetup] DATABASE_URL not set — skipping test-state reset')
    return
  }

  const client = new Client({ connectionString })
  await client.connect()
  try {
    // 1. Un-complete the onboarding accounts (the gate spec needs a fresh one; the
    //    completion spec flips its own to done). Kept as separate accounts so they
    //    never clobber each other within a run.
    const onboardingEmails = [
      process.env.E2E_ONBOARDING_EMAIL,
      process.env.E2E_NEWUSER_EMAIL,
    ].filter(Boolean) as string[]
    if (onboardingEmails.length) {
      await client.query(
        `UPDATE profiles SET onboarding_completed = false WHERE email = ANY($1)`,
        [onboardingEmails],
      )
    }

    // 2. Clear the test member's RSVP + serving signup so those actions are fresh
    //    (the app has no un-RSVP endpoint, so a re-run would otherwise 409).
    const memberId = process.env.E2E_MEMBER_ID
    if (memberId && process.env.E2E_EVENT_ID) {
      await client.query(
        `DELETE FROM event_registrations WHERE profile_id = $1 AND event_id = $2`,
        [memberId, process.env.E2E_EVENT_ID],
      )
    }
    if (memberId && process.env.E2E_SLOT_ID) {
      await client.query(
        `DELETE FROM serving_signups WHERE profile_id = $1 AND slot_id = $2`,
        [memberId, process.env.E2E_SLOT_ID],
      )
    }

    // 3. Tidy the "[E2E] Visitor" rows the public-intake spec creates.
    await client.query(`DELETE FROM visitors WHERE first_name = '[E2E]'`)
  } finally {
    await client.end()
  }
}
