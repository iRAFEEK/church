import { createServerClient, type CookieMethodsServer } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

function getCookieMethods(): CookieMethodsServer {
  return {
    async getAll() {
      const cookieStore = await cookies()
      return cookieStore.getAll()
    },
    async setAll(cookiesToSet) {
      const cookieStore = await cookies()
      try {
        cookiesToSet.forEach(({ name, value, options }) =>
          cookieStore.set(name, value, options)
        )
      } catch {
        // Ignore in Server Components
      }
    },
  }
}

export async function createClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: getCookieMethods() }
  )
}

export async function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}
