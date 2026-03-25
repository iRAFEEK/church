import { NextResponse } from 'next/server'
import { apiHandler } from '@/lib/api/handler'
import type { ConferenceBoardColumnWithCards, ConferenceBoardCardWithDetails } from '@/types'

// GET /api/events/[id]/conference/board — full board with columns, cards, counts
export const GET = apiHandler(async ({ supabase, user, profile, params }) => {
  const eventId = params!.id

  // Access: can_plan_conference_board OR assigned_leader_id = caller
  const isAdmin =
    profile.role === 'super_admin' || profile.role === 'ministry_leader'

  if (!isAdmin) {
    // Check if user is assigned to any card in this event
    const { data: assignedCard } = await supabase
      .from('conference_board_cards')
      .select('id')
      .eq('event_id', eventId)
      .eq('church_id', profile.church_id)
      .eq('assigned_leader_id', user.id)
      .limit(1)
      .single()

    // Also check collaborators
    const { data: collaborator } = await supabase
      .from('conference_collaborators')
      .select('id')
      .eq('event_id', eventId)
      .eq('church_id', profile.church_id)
      .eq('user_id', user.id)
      .not('accepted_at', 'is', null)
      .limit(1)
      .single()

    if (!assignedCard && !collaborator) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  // Fetch columns + cards in parallel
  const [columnsResult, cardsResult, tasksResult, resourcesResult] = await Promise.all([
    supabase
      .from('conference_board_columns')
      .select('id, church_id, event_id, name, name_ar, sort_order, created_at, updated_at')
      .eq('event_id', eventId)
      .eq('church_id', profile.church_id)
      .order('sort_order', { ascending: true }),
    supabase
      .from('conference_board_cards')
      .select(`id, church_id, event_id, column_id, ministry_id, custom_name, custom_name_ar,
               assigned_leader_id, assigned_leader_external_phone, headcount_target, status, sort_order, leader_notified_at, created_at, updated_at,
               ministry:ministry_id(id, name, name_ar),
               assigned_leader:assigned_leader_id(id, first_name, last_name, first_name_ar, last_name_ar, photo_url)`)
      .eq('event_id', eventId)
      .eq('church_id', profile.church_id)
      .order('sort_order', { ascending: true }),
    supabase
      .from('conference_tasks')
      .select('card_id, status')
      .eq('event_id', eventId)
      .eq('church_id', profile.church_id)
      .not('card_id', 'is', null),
    supabase
      .from('conference_resources')
      .select('card_id')
      .eq('event_id', eventId)
      .eq('church_id', profile.church_id)
      .not('card_id', 'is', null),
  ])

  if (columnsResult.error) throw columnsResult.error
  if (cardsResult.error) throw cardsResult.error

  type TaskCountRow = { card_id: string; status: string }
  type ResourceCountRow = { card_id: string }

  const tasksByCard = new Map<string, TaskCountRow[]>()
  for (const t of (tasksResult.data || []) as TaskCountRow[]) {
    if (!t.card_id) continue
    const arr = tasksByCard.get(t.card_id) || []
    arr.push(t)
    tasksByCard.set(t.card_id, arr)
  }

  const resourceCountByCard = new Map<string, number>()
  for (const r of (resourcesResult.data || []) as ResourceCountRow[]) {
    if (!r.card_id) continue
    resourceCountByCard.set(r.card_id, (resourceCountByCard.get(r.card_id) || 0) + 1)
  }

  // Build cards with counts
  const cardsWithDetails: ConferenceBoardCardWithDetails[] = ((cardsResult.data || []) as unknown as ConferenceBoardCardWithDetails[]).map((card) => {
    const cardTasks = tasksByCard.get(card.id) || []
    return {
      ...card,
      task_count: cardTasks.length,
      done_task_count: cardTasks.filter((t) => t.status === 'done').length,
      resource_count: resourceCountByCard.get(card.id) || 0,
    }
  })

  // Group cards by column
  const cardsByColumn = new Map<string, ConferenceBoardCardWithDetails[]>()
  for (const card of cardsWithDetails) {
    if (!card.column_id) continue
    const arr = cardsByColumn.get(card.column_id) || []
    arr.push(card)
    cardsByColumn.set(card.column_id, arr)
  }

  const columns: ConferenceBoardColumnWithCards[] = ((columnsResult.data || []) as unknown as ConferenceBoardColumnWithCards[]).map((col) => ({
    ...col,
    cards: cardsByColumn.get(col.id) || [],
  }))

  return { data: columns }
})
