import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Mock setup — vi.hoisted so factory closures can reference them
// ---------------------------------------------------------------------------

type QueryResult = { data: unknown; error?: unknown }

const { mockSendNotification, mockWhatsappSend, mockLoggerError } = vi.hoisted(() => ({
  mockSendNotification: vi.fn(),
  mockWhatsappSend: vi.fn(),
  mockLoggerError: vi.fn(),
}))

let queryResults: Record<string, QueryResult> = {}

function makeChain(table: string) {
  const chain = {
    select: () => chain,
    eq: () => chain,
    single: () => Promise.resolve(queryResults[table] ?? { data: null }),
    insert: () => Promise.resolve({ data: null, error: null }),
  }
  return chain
}

function makeMockSupabase() {
  return { from: (table: string) => makeChain(table) }
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(makeMockSupabase())),
  createAdminClient: vi.fn(() => Promise.resolve(makeMockSupabase())),
}))

vi.mock('../dispatcher', () => ({
  sendNotification: mockSendNotification,
}))

vi.mock('../providers/whatsapp', () => ({
  whatsappProvider: {
    send: mockWhatsappSend,
    isConfigured: () => true,
  },
}))

vi.mock('@/lib/logger', () => ({
  logger: { error: mockLoggerError, info: vi.fn(), warn: vi.fn() },
}))

// ---------------------------------------------------------------------------
// Import under test (after mocks)
// ---------------------------------------------------------------------------
import {
  notifyWelcomeVisitor,
  notifyVisitorAssigned,
  notifyAtRiskMember,
  notifyVisitorSLA,
  notifyEventServiceRequest,
  notifyNeedResponseReceived,
  notifyNeedResponseStatusChanged,
  notifyNeedMessage,
  notifyGatheringReminder,
} from '../triggers'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
beforeEach(() => {
  vi.clearAllMocks()
  queryResults = {}
})

// ---------------------------------------------------------------------------
// truncate (tested indirectly via notifyNeedResponseReceived)
// ---------------------------------------------------------------------------
describe('truncate (indirectly)', () => {
  it('passes original text through when under max length', async () => {
    const shortMsg = 'Hello'
    queryResults = {
      church_needs: {
        data: { title: 'Need A', title_ar: '', church_id: 'c1', created_by: 'u1' },
      },
      churches: { data: { name: 'Church B', name_ar: '' } },
    }

    await notifyNeedResponseReceived('n1', 'rc1', shortMsg)

    expect(mockSendNotification).toHaveBeenCalledTimes(1)
    const call = mockSendNotification.mock.calls[0][0]
    expect(call.data.message).toBe(shortMsg)
  })

  it('truncates with "…" when over 100 chars', async () => {
    const longMsg = 'A'.repeat(150)
    queryResults = {
      church_needs: {
        data: { title: 'Need A', title_ar: '', church_id: 'c1', created_by: 'u1' },
      },
      churches: { data: { name: 'Church B', name_ar: '' } },
    }

    await notifyNeedResponseReceived('n1', 'rc1', longMsg)

    expect(mockSendNotification).toHaveBeenCalledTimes(1)
    const call = mockSendNotification.mock.calls[0][0]
    expect(call.data.message).toBe('A'.repeat(100) + '…')
  })
})

// ---------------------------------------------------------------------------
// notifyWelcomeVisitor
// ---------------------------------------------------------------------------
describe('notifyWelcomeVisitor', () => {
  it('sends WhatsApp when visitor has a phone', async () => {
    queryResults = {
      visitors: {
        data: { first_name: 'John', last_name: 'Doe', phone: '+201234567890', email: null },
      },
      churches: { data: { name: 'Grace Church', name_ar: 'كنيسة النعمة' } },
    }

    await notifyWelcomeVisitor('v1', 'c1')

    expect(mockWhatsappSend).toHaveBeenCalledTimes(1)
    expect(mockWhatsappSend).toHaveBeenCalledWith(
      expect.objectContaining({
        to: '+201234567890',
        channel: 'whatsapp',
      })
    )
  })

  it('does nothing when visitor has no phone', async () => {
    queryResults = {
      visitors: {
        data: { first_name: 'John', last_name: 'Doe', phone: null, email: null },
      },
      churches: { data: { name: 'Grace Church', name_ar: '' } },
    }

    await notifyWelcomeVisitor('v1', 'c1')

    expect(mockWhatsappSend).not.toHaveBeenCalled()
  })

  it('does nothing when church not found', async () => {
    queryResults = {
      visitors: {
        data: { first_name: 'John', last_name: 'Doe', phone: '+201234567890', email: null },
      },
      churches: { data: null },
    }

    await notifyWelcomeVisitor('v1', 'c1')

    expect(mockWhatsappSend).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// notifyVisitorAssigned
// ---------------------------------------------------------------------------
describe('notifyVisitorAssigned', () => {
  it('calls sendNotification with correct params', async () => {
    queryResults = {
      visitors: { data: { first_name: 'Jane', last_name: 'Smith' } },
    }

    await notifyVisitorAssigned('v1', 'leader-1', 'c1')

    expect(mockSendNotification).toHaveBeenCalledTimes(1)
    expect(mockSendNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        profileId: 'leader-1',
        churchId: 'c1',
        type: 'visitor_assigned',
        referenceId: 'v1',
        referenceType: 'visitor',
      })
    )
  })

  it('does nothing when visitor not found', async () => {
    queryResults = {
      visitors: { data: null },
    }

    await notifyVisitorAssigned('v1', 'leader-1', 'c1')

    expect(mockSendNotification).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// notifyAtRiskMember
// ---------------------------------------------------------------------------
describe('notifyAtRiskMember', () => {
  it('includes streak in weeks param', async () => {
    queryResults = {
      profiles: {
        data: { first_name: 'Mark', first_name_ar: 'مارك', last_name: 'Lee', last_name_ar: 'لي' },
      },
      groups: { data: { name: 'Youth', name_ar: 'الشباب', leader_id: 'leader-1' } },
    }

    await notifyAtRiskMember('m1', 'g1', 'c1', 4)

    expect(mockSendNotification).toHaveBeenCalledTimes(1)
    const call = mockSendNotification.mock.calls[0][0]
    expect(call.data.weeks).toBe('4')
    expect(call.profileId).toBe('leader-1')
    expect(call.type).toBe('at_risk_alert')
  })

  it('does nothing when member not found', async () => {
    queryResults = {
      profiles: { data: null },
      groups: { data: { name: 'Youth', name_ar: '', leader_id: 'leader-1' } },
    }

    await notifyAtRiskMember('m1', 'g1', 'c1', 3)

    expect(mockSendNotification).not.toHaveBeenCalled()
  })

  it('does nothing when group has no leader', async () => {
    queryResults = {
      profiles: {
        data: { first_name: 'Mark', first_name_ar: '', last_name: 'Lee', last_name_ar: '' },
      },
      groups: { data: { name: 'Youth', name_ar: '', leader_id: null } },
    }

    await notifyAtRiskMember('m1', 'g1', 'c1', 3)

    expect(mockSendNotification).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// notifyVisitorSLA
// ---------------------------------------------------------------------------
describe('notifyVisitorSLA', () => {
  it('sends to all admins', async () => {
    // We need per-call differentiation. Override the mock for this test.
    const { createClient } = await import('@/lib/supabase/server')
    const adminList = [{ id: 'admin-1' }, { id: 'admin-2' }, { id: 'admin-3' }]

    let fromCallCount = 0
    const customSupabase = {
      from: (table: string) => {
        if (table === 'visitors') {
          return {
            select: () => ({
              eq: () => ({
                single: () =>
                  Promise.resolve({
                    data: { first_name: 'Sara', last_name: 'Jones' },
                  }),
              }),
            }),
          }
        }
        if (table === 'profiles') {
          return {
            select: () => ({
              eq: (_col: string, _val: string) => ({
                eq: () =>
                  Promise.resolve({ data: adminList }),
              }),
            }),
          }
        }
        return makeChain(table)
      },
    }
    vi.mocked(createClient).mockResolvedValueOnce(customSupabase as unknown as Awaited<ReturnType<typeof createClient>>)

    await notifyVisitorSLA('v1', 'c1')

    expect(mockSendNotification).toHaveBeenCalledTimes(3)
    expect(mockSendNotification).toHaveBeenCalledWith(
      expect.objectContaining({ profileId: 'admin-1' })
    )
    expect(mockSendNotification).toHaveBeenCalledWith(
      expect.objectContaining({ profileId: 'admin-2' })
    )
    expect(mockSendNotification).toHaveBeenCalledWith(
      expect.objectContaining({ profileId: 'admin-3' })
    )
  })

  it('does nothing when no admins found', async () => {
    const { createClient } = await import('@/lib/supabase/server')

    const customSupabase = {
      from: (table: string) => {
        if (table === 'visitors') {
          return {
            select: () => ({
              eq: () => ({
                single: () =>
                  Promise.resolve({
                    data: { first_name: 'Sara', last_name: 'Jones' },
                  }),
              }),
            }),
          }
        }
        if (table === 'profiles') {
          return {
            select: () => ({
              eq: () => ({
                eq: () => Promise.resolve({ data: [] }),
              }),
            }),
          }
        }
        return makeChain(table)
      },
    }
    vi.mocked(createClient).mockResolvedValueOnce(customSupabase as unknown as Awaited<ReturnType<typeof createClient>>)

    await notifyVisitorSLA('v1', 'c1')

    expect(mockSendNotification).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// notifyEventServiceRequest
// ---------------------------------------------------------------------------
describe('notifyEventServiceRequest', () => {
  it('calls sendNotification for ministry leader', async () => {
    const { createClient } = await import('@/lib/supabase/server')

    const customSupabase = {
      from: (table: string) => {
        const results: Record<string, QueryResult> = {
          event_service_needs: {
            data: { ministry_id: 'min-1', group_id: null, volunteers_needed: 5 },
          },
          events: {
            data: { title: 'Sunday Service', title_ar: 'خدمة الأحد', starts_at: '2026-04-01T10:00:00Z' },
          },
          ministries: {
            data: { name: 'Worship', name_ar: 'التسبيح', leader_id: 'leader-1' },
          },
        }
        return {
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve(results[table] ?? { data: null }),
            }),
          }),
        }
      },
    }
    vi.mocked(createClient).mockResolvedValueOnce(customSupabase as unknown as Awaited<ReturnType<typeof createClient>>)

    await notifyEventServiceRequest('e1', 'sn1', 'c1')

    expect(mockSendNotification).toHaveBeenCalledTimes(1)
    expect(mockSendNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        profileId: 'leader-1',
        type: 'event_service_request',
        referenceId: 'e1',
      })
    )
  })
})

// ---------------------------------------------------------------------------
// notifyNeedResponseReceived
// ---------------------------------------------------------------------------
describe('notifyNeedResponseReceived', () => {
  it('calls sendNotification to need creator', async () => {
    queryResults = {
      church_needs: {
        data: { title: 'Need blankets', title_ar: 'نحتاج بطانيات', church_id: 'c1', created_by: 'u1' },
      },
      churches: { data: { name: 'Helper Church', name_ar: 'كنيسة المساعدة' } },
    }

    await notifyNeedResponseReceived('n1', 'rc1', 'We can help!')

    expect(mockSendNotification).toHaveBeenCalledTimes(1)
    expect(mockSendNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        profileId: 'u1',
        churchId: 'c1',
        type: 'need_response_received',
        referenceId: 'n1',
        referenceType: 'church_need',
      })
    )
  })
})

// ---------------------------------------------------------------------------
// notifyNeedResponseStatusChanged
// ---------------------------------------------------------------------------
describe('notifyNeedResponseStatusChanged', () => {
  it('sends status update notification', async () => {
    queryResults = {
      church_need_responses: {
        data: { responder_user_id: 'resp-u1', responder_church_id: 'rc1' },
      },
      church_needs: {
        data: { title: 'Need blankets', title_ar: 'نحتاج بطانيات', church_id: 'c1' },
      },
      churches: { data: { name: 'Owner Church', name_ar: 'كنيسة المالك' } },
    }

    await notifyNeedResponseStatusChanged('n1', 'r1', 'accepted')

    expect(mockSendNotification).toHaveBeenCalledTimes(1)
    expect(mockSendNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        profileId: 'resp-u1',
        churchId: 'rc1',
        type: 'need_response_status_changed',
        referenceId: 'n1',
      })
    )
    const call = mockSendNotification.mock.calls[0][0]
    expect(call.data.status).toBe('accepted')
  })
})

// ---------------------------------------------------------------------------
// notifyNeedMessage
// ---------------------------------------------------------------------------
describe('notifyNeedMessage', () => {
  it('routes to correct recipient when sender is not the need owner', async () => {
    const { createAdminClient } = await import('@/lib/supabase/server')

    // sender is the need owner => recipient is the responder
    // sender is NOT the need owner => recipient is need.created_by
    // Here: senderChurchId !== need.church_id, so recipient = need.created_by? No.
    // If recipientChurchId === need.church_id => recipientUserId = need.created_by
    // If recipientChurchId !== need.church_id => look up response.responder_user_id

    // Test: recipientChurchId === need.church_id => goes to need.created_by
    const customSupabase = {
      from: (table: string) => {
        const results: Record<string, QueryResult> = {
          church_needs: {
            data: { title: 'Help needed', title_ar: '', church_id: 'owner-c', created_by: 'owner-u' },
          },
          churches: { data: { name: 'Sender Church', name_ar: '' } },
        }
        return {
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve(results[table] ?? { data: null }),
            }),
          }),
        }
      },
    }
    vi.mocked(createAdminClient).mockResolvedValueOnce(customSupabase as unknown as Awaited<ReturnType<typeof createAdminClient>>)

    await notifyNeedMessage('n1', 'r1', 'sender-c', 'owner-c', 'Thank you!')

    expect(mockSendNotification).toHaveBeenCalledTimes(1)
    expect(mockSendNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        profileId: 'owner-u',
        churchId: 'owner-c',
        type: 'need_message',
      })
    )
  })
})

// ---------------------------------------------------------------------------
// notifyGatheringReminder
// ---------------------------------------------------------------------------
describe('notifyGatheringReminder', () => {
  it('sends to all group members', async () => {
    const { createClient } = await import('@/lib/supabase/server')

    const customSupabase = {
      from: (table: string) => {
        if (table === 'gatherings') {
          return {
            select: () => ({
              eq: () => ({
                single: () =>
                  Promise.resolve({
                    data: {
                      group_id: 'g1',
                      scheduled_at: '2026-04-01T18:00:00Z',
                      location: 'Room A',
                      topic: 'Prayer',
                    },
                  }),
              }),
            }),
          }
        }
        if (table === 'groups') {
          return {
            select: () => ({
              eq: () => ({
                single: () =>
                  Promise.resolve({
                    data: { name: 'Youth Group', name_ar: 'مجموعة الشباب' },
                  }),
              }),
            }),
          }
        }
        if (table === 'group_members') {
          return {
            select: () => ({
              eq: (_col: string, _val: unknown) => ({
                eq: () =>
                  Promise.resolve({
                    data: [{ profile_id: 'p1' }, { profile_id: 'p2' }],
                  }),
              }),
            }),
          }
        }
        return makeChain(table)
      },
    }
    vi.mocked(createClient).mockResolvedValueOnce(customSupabase as unknown as Awaited<ReturnType<typeof createClient>>)

    await notifyGatheringReminder('g1', 'c1')

    expect(mockSendNotification).toHaveBeenCalledTimes(2)
    expect(mockSendNotification).toHaveBeenCalledWith(
      expect.objectContaining({ profileId: 'p1', type: 'gathering_reminder' })
    )
    expect(mockSendNotification).toHaveBeenCalledWith(
      expect.objectContaining({ profileId: 'p2', type: 'gathering_reminder' })
    )
  })
})

// ---------------------------------------------------------------------------
// Error resilience — all triggers catch errors and don't throw
// ---------------------------------------------------------------------------
describe('error resilience', () => {
  it('all triggers catch errors and do not throw', async () => {
    const { createClient, createAdminClient } = await import('@/lib/supabase/server')
    const throwingClient = {
      from: () => {
        throw new Error('DB connection failed')
      },
    }
    vi.mocked(createClient).mockResolvedValue(throwingClient as unknown as Awaited<ReturnType<typeof createClient>>)
    vi.mocked(createAdminClient).mockResolvedValue(throwingClient as unknown as Awaited<ReturnType<typeof createAdminClient>>)

    // None of these should throw
    await expect(notifyWelcomeVisitor('v1', 'c1')).resolves.toBeUndefined()
    await expect(notifyVisitorAssigned('v1', 'l1', 'c1')).resolves.toBeUndefined()
    await expect(notifyAtRiskMember('m1', 'g1', 'c1', 3)).resolves.toBeUndefined()
    await expect(notifyVisitorSLA('v1', 'c1')).resolves.toBeUndefined()
    await expect(notifyEventServiceRequest('e1', 'sn1', 'c1')).resolves.toBeUndefined()
    await expect(notifyNeedResponseReceived('n1', 'rc1', 'msg')).resolves.toBeUndefined()
    await expect(notifyNeedResponseStatusChanged('n1', 'r1', 'accepted')).resolves.toBeUndefined()
    await expect(notifyNeedMessage('n1', 'r1', 'sc', 'rc', 'msg')).resolves.toBeUndefined()
    await expect(notifyGatheringReminder('g1', 'c1')).resolves.toBeUndefined()

    expect(mockLoggerError).toHaveBeenCalled()
  })
})
