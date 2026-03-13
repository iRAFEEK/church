import { apiHandler } from '@/lib/api/handler'
import { createAdminClient } from '@/lib/supabase/server'

// GET /api/community/needs/messages — list all active conversations for the user's church
export const GET = apiHandler(async ({ profile }) => {
  const admin = await createAdminClient()
  const myChurchId = profile.church_id

  // 1. Get all responses where this church is owner or responder, and status is accepted/completed
  const { data: responses, error: respErr } = await admin
    .from('church_need_responses')
    .select(`
      id,
      need_id,
      responder_church_id,
      status,
      need:need_id(church_id, title, title_ar),
      responder_church:responder_church_id(id, name, name_ar, logo_url)
    `)
    .in('status', ['accepted', 'completed'])

  if (respErr) throw respErr
  if (!responses?.length) return { data: [] }

  // Filter to only conversations involving this church
  const relevant = responses.filter((r) => {
    const need = r.need as unknown as { church_id: string } | null
    return need?.church_id === myChurchId || r.responder_church_id === myChurchId
  })

  if (!relevant.length) return { data: [] }

  const responseIds = relevant.map(r => r.id)

  // 2. Get latest message per response + all messages for unread counting
  const [{ data: allMessages }, { data: reads }] = await Promise.all([
    admin
      .from('church_need_messages' as any)
      .select('id, response_id, message, message_ar, sender_church_id, created_at')
      .in('response_id', responseIds)
      .order('created_at', { ascending: false }),
    admin
      .from('church_need_message_reads' as any)
      .select('response_id, last_read_at')
      .eq('church_id', myChurchId)
      .in('response_id', responseIds),
  ])

  const readMap = new Map(((reads || []) as any[]).map((r: any) => [r.response_id, r.last_read_at]))

  // Group messages by response_id, take latest
  const latestByResponse = new Map<string, any>()
  const unreadByResponse = new Map<string, number>()

  for (const msg of ((allMessages || []) as any[])) {
    if (!latestByResponse.has(msg.response_id)) {
      latestByResponse.set(msg.response_id, msg)
    }
    // Count unread: messages after last_read_at that are NOT from this church
    const lastRead = readMap.get(msg.response_id)
    if (msg.sender_church_id !== myChurchId && (!lastRead || new Date(msg.created_at) > new Date(lastRead))) {
      unreadByResponse.set(msg.response_id, (unreadByResponse.get(msg.response_id) || 0) + 1)
    }
  }

  // 3. Build conversation list (only responses that have messages)
  const conversations = relevant
    .filter(r => latestByResponse.has(r.id))
    .map(r => {
      const need = r.need as unknown as { church_id: string; title: string; title_ar: string | null }
      const isOwner = need.church_id === myChurchId
      const latest = latestByResponse.get(r.id)!

      // The "other" church: if I'm owner, it's the responder. If I'm responder, I need the owner church.
      let otherChurch: { id: string; name: string; name_ar: string | null; logo_url: string | null }
      if (isOwner) {
        const rc = r.responder_church as unknown as { id: string; name: string; name_ar: string | null; logo_url: string | null }
        otherChurch = rc
      } else {
        // Need to get owner church info — we don't have it in the join. Use a placeholder.
        otherChurch = { id: need.church_id, name: '', name_ar: null, logo_url: null }
      }

      return {
        responseId: r.id,
        needId: r.need_id,
        needTitle: need.title,
        needTitleAr: need.title_ar,
        otherChurch,
        lastMessage: latest.message,
        lastMessageAr: latest.message_ar,
        lastMessageAt: latest.created_at,
        lastSenderChurchId: latest.sender_church_id,
        unreadCount: unreadByResponse.get(r.id) || 0,
      }
    })
    .sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime())

  // 4. Fill in owner church names for responder-side conversations
  const ownerChurchIds = [...new Set(conversations.filter(c => !c.otherChurch.name).map(c => c.otherChurch.id))]
  if (ownerChurchIds.length > 0) {
    const { data: ownerChurches } = await admin
      .from('churches')
      .select('id, name, name_ar, logo_url')
      .in('id', ownerChurchIds)

    const churchMap = new Map((ownerChurches || []).map(c => [c.id, c]))
    for (const conv of conversations) {
      if (!conv.otherChurch.name) {
        const church = churchMap.get(conv.otherChurch.id)
        if (church) {
          conv.otherChurch = church
        }
      }
    }
  }

  const totalUnread = conversations.reduce((sum, c) => sum + c.unreadCount, 0)

  return { data: conversations, totalUnread }
}, { requirePermissions: ['can_view_church_needs'] })
