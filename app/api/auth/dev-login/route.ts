import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  // Only allow in development
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not available' }, { status: 403 })
  }

  const { email } = await req.json()

  if (!email || !email.endsWith('@gracechurch.test')) {
    return NextResponse.json({ error: 'Invalid test email' }, { status: 400 })
  }

  const supabase = await createAdminClient()

  // Look up the user by email
  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers()

  if (listError) {
    console.error('[/api/auth/dev-login POST]', listError)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }

  const user = users.find(u => u.email === email)
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  // Generate a magic link (sign-in link) that bypasses password
  const { data, error } = await supabase.auth.admin.generateLink({
    type: 'magiclink',
    email,
  })

  if (error || !data) {
    console.error('[/api/auth/dev-login POST]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }

  // Return the token hash and verification type for client-side verification
  const url = new URL(data.properties.action_link)
  const token_hash = url.searchParams.get('token') || url.hash
  const type = url.searchParams.get('type') || 'magiclink'

  return NextResponse.json({
    action_link: data.properties.action_link,
    hashed_token: data.properties.hashed_token,
    verification_type: type,
  })
}
