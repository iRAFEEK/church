import { NextResponse } from 'next/server'
import { apiHandler } from '@/lib/api/handler'

// GET /api/conference/invite/[token] — public invite lookup
export const GET = apiHandler(async ({ supabase, params }) => {
  const token = params!.token

  const { data: invite } = await supabase
    .from('conference_collaborators')
    .select(`id, event_id, card_id, role, accepted_at, created_at,
             event:event_id(id, title, title_ar, starts_at, ends_at,
               church:church_id(id, name, name_ar))`)
    .eq('invite_token', token)
    .single()

  if (!invite) {
    return NextResponse.json({ error: 'Invite not found or already used' }, { status: 404 })
  }

  // Expose just enough for the frontend to display the invitation
  return {
    data: {
      invite_id: invite.id,
      event_id: invite.event_id,
      card_id: invite.card_id,
      role: invite.role,
      already_accepted: invite.accepted_at !== null,
      event: (invite as unknown as { event: unknown }).event,
    },
  }
}, { requireAuth: false })
