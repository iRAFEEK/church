// ARCH: Centralized audit logging. Use in API routes for sensitive operations:
// - Member status changes
// - Role changes
// - Deletions (soft or hard)
// - Group membership changes
// - Visitor assignment changes
//
// Fire-and-forget pattern: audit logging should never block the main request.

import { createClient } from '@/lib/supabase/server'

interface AuditEvent {
  churchId: string
  actorId: string
  action: string
  entityType: string
  entityId: string
  oldValue?: object | null
  newValue?: object | null
  metadata?: object | null
}

export async function logAuditEvent({
  churchId,
  actorId,
  action,
  entityType,
  entityId,
  oldValue,
  newValue,
  metadata,
}: AuditEvent) {
  try {
    const supabase = await createClient()
    // ARCH: Intentionally not awaited in most callsites — fire and forget
    await supabase.from('audit_logs').insert({
      church_id: churchId,
      actor_id: actorId,
      action,
      entity_type: entityType,
      entity_id: entityId,
      old_value: oldValue ?? null,
      new_value: newValue ?? null,
      metadata: metadata ?? null,
    })
  } catch (err) {
    // ARCH: Never let audit logging failures break the main request
    console.error('[AUDIT] Failed to log event:', action, entityType, entityId, err)
  }
}

// Common audit action constants
export const AUDIT_ACTIONS = {
  MEMBER_STATUS_CHANGED: 'member.status_changed',
  MEMBER_ROLE_CHANGED: 'member.role_changed',
  MEMBER_DELETED: 'member.deleted',
  GROUP_CREATED: 'group.created',
  GROUP_DELETED: 'group.deleted',
  GROUP_MEMBER_ADDED: 'group.member_added',
  GROUP_MEMBER_REMOVED: 'group.member_removed',
  EVENT_CREATED: 'event.created',
  EVENT_DELETED: 'event.deleted',
  VISITOR_ASSIGNED: 'visitor.assigned',
  VISITOR_STATUS_CHANGED: 'visitor.status_changed',
  VISITOR_CONVERTED: 'visitor.converted',
  ANNOUNCEMENT_PUBLISHED: 'announcement.published',
  SONG_DELETED: 'song.deleted',
  PERMISSION_CHANGED: 'permission.changed',
} as const
