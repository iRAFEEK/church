import { createBrowserClient } from '@supabase/ssr'

// Note: Once connected to Supabase, generate types with:
// npx supabase gen types typescript --project-id YOUR_PROJECT_ID > types/database.ts
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
