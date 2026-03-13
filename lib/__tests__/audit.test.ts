import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockInsert = vi.fn().mockResolvedValue({ data: null, error: null })
const mockFrom = vi.fn().mockReturnValue({ insert: mockInsert })
const mockCreateClient = vi.fn().mockResolvedValue({ from: mockFrom })

vi.mock('@/lib/supabase/server', () => ({
  createClient: (...args: unknown[]) => mockCreateClient(...args),
}))

const mockLoggerError = vi.fn()
vi.mock('@/lib/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: (...args: unknown[]) => mockLoggerError(...args),
  },
}))

// Import after mocks
import { logAuditEvent, AUDIT_ACTIONS } from '@/lib/audit'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const baseEvent = {
  churchId: 'church-uuid-1',
  actorId: 'actor-uuid-1',
  action: 'member.status_changed',
  entityType: 'member',
  entityId: 'entity-uuid-1',
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('logAuditEvent', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockInsert.mockResolvedValue({ data: null, error: null })
    mockCreateClient.mockResolvedValue({ from: mockFrom })
  })

  it('inserts correct columns into audit_logs', async () => {
    await logAuditEvent(baseEvent)

    expect(mockFrom).toHaveBeenCalledWith('audit_logs')
    expect(mockInsert).toHaveBeenCalledWith({
      church_id: 'church-uuid-1',
      actor_id: 'actor-uuid-1',
      action: 'member.status_changed',
      entity_type: 'member',
      entity_id: 'entity-uuid-1',
      old_value: null,
      new_value: null,
      metadata: null,
    })
  })

  it('passes null for optional fields when not provided', async () => {
    await logAuditEvent(baseEvent)

    const insertArg = mockInsert.mock.calls[0][0] as Record<string, unknown>
    expect(insertArg.old_value).toBeNull()
    expect(insertArg.new_value).toBeNull()
    expect(insertArg.metadata).toBeNull()
  })

  it('handles all provided fields including oldValue, newValue, and metadata', async () => {
    const oldValue = { status: 'active' }
    const newValue = { status: 'inactive' }
    const metadata = { reason: 'moved away', changedBy: 'admin' }

    await logAuditEvent({
      ...baseEvent,
      oldValue,
      newValue,
      metadata,
    })

    expect(mockInsert).toHaveBeenCalledWith({
      church_id: baseEvent.churchId,
      actor_id: baseEvent.actorId,
      action: baseEvent.action,
      entity_type: baseEvent.entityType,
      entity_id: baseEvent.entityId,
      old_value: oldValue,
      new_value: newValue,
      metadata,
    })
  })

  it('never throws when insert fails — fire-and-forget', async () => {
    mockInsert.mockRejectedValue(new Error('DB connection lost'))

    // Should resolve without throwing
    await expect(logAuditEvent(baseEvent)).resolves.toBeUndefined()
  })

  it('logs error via logger when insert fails', async () => {
    const dbError = new Error('DB connection lost')
    mockInsert.mockRejectedValue(dbError)

    await logAuditEvent(baseEvent)

    expect(mockLoggerError).toHaveBeenCalledWith('Failed to log audit event', {
      module: 'audit',
      churchId: baseEvent.churchId,
      action: baseEvent.action,
      entityType: baseEvent.entityType,
      entityId: baseEvent.entityId,
      error: dbError,
    })
  })

  it('catches errors from createClient itself', async () => {
    const clientError = new Error('Cookie store unavailable')
    mockCreateClient.mockRejectedValue(clientError)

    await expect(logAuditEvent(baseEvent)).resolves.toBeUndefined()

    expect(mockLoggerError).toHaveBeenCalledWith('Failed to log audit event', {
      module: 'audit',
      churchId: baseEvent.churchId,
      action: baseEvent.action,
      entityType: baseEvent.entityType,
      entityId: baseEvent.entityId,
      error: clientError,
    })
  })
})

describe('AUDIT_ACTIONS', () => {
  it('has 15 entries', () => {
    expect(Object.keys(AUDIT_ACTIONS)).toHaveLength(15)
  })

  it('all values follow entity.action pattern', () => {
    const pattern = /^[a-z_]+\.[a-z_]+$/
    for (const [key, value] of Object.entries(AUDIT_ACTIONS)) {
      expect(value, `${key} should match entity.action pattern`).toMatch(pattern)
    }
  })
})
