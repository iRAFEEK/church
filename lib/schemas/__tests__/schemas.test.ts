import { describe, it, expect } from 'vitest'
import { CreateVisitorSchema, UpdateVisitorSchema } from '../visitor'
import { CreateAnnouncementSchema, UpdateAnnouncementSchema } from '../announcement'
import { CreateEventSchema } from '../event'
import { CreateGatheringSchema } from '../gathering'
import { CreateServingSlotSchema } from '../serving'
import { SendNotificationSchema } from '../notification'
import { UpdateProfileSchema } from '../profile'

describe('CreateVisitorSchema', () => {
  it('accepts valid visitor data', () => {
    const result = CreateVisitorSchema.safeParse({
      first_name: 'John',
      last_name: 'Doe',
    })
    expect(result.success).toBe(true)
  })

  it('accepts full visitor data with all optional fields', () => {
    const result = CreateVisitorSchema.safeParse({
      first_name: 'John',
      last_name: 'Doe',
      first_name_ar: 'جون',
      last_name_ar: 'دو',
      phone: '+20123456789',
      email: 'john@example.com',
      age_range: '26_35',
      occupation: 'Engineer',
      how_heard: 'friend',
    })
    expect(result.success).toBe(true)
  })

  it('rejects missing first_name', () => {
    const result = CreateVisitorSchema.safeParse({
      last_name: 'Doe',
    })
    expect(result.success).toBe(false)
  })

  it('rejects missing last_name', () => {
    const result = CreateVisitorSchema.safeParse({
      first_name: 'John',
    })
    expect(result.success).toBe(false)
  })

  it('rejects empty first_name', () => {
    const result = CreateVisitorSchema.safeParse({
      first_name: '',
      last_name: 'Doe',
    })
    expect(result.success).toBe(false)
  })

  it('rejects invalid email', () => {
    const result = CreateVisitorSchema.safeParse({
      first_name: 'John',
      last_name: 'Doe',
      email: 'not-an-email',
    })
    expect(result.success).toBe(false)
  })

  it('rejects invalid age_range enum value', () => {
    const result = CreateVisitorSchema.safeParse({
      first_name: 'John',
      last_name: 'Doe',
      age_range: 'invalid',
    })
    expect(result.success).toBe(false)
  })

  it('rejects invalid how_heard enum value', () => {
    const result = CreateVisitorSchema.safeParse({
      first_name: 'John',
      last_name: 'Doe',
      how_heard: 'newspaper',
    })
    expect(result.success).toBe(false)
  })

  it('strips unknown fields (mass assignment protection)', () => {
    const result = CreateVisitorSchema.safeParse({
      first_name: 'John',
      last_name: 'Doe',
      church_id: '550e8400-e29b-41d4-a716-446655440000',
      role: 'super_admin',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      // church_id is a valid schema field (used by public visitor form)
      expect((result.data as Record<string, unknown>).church_id).toBe('550e8400-e29b-41d4-a716-446655440000')
      // role should still be stripped — not in schema
      expect((result.data as Record<string, unknown>).role).toBeUndefined()
    }
  })

  it('rejects non-UUID church_id (mass assignment protection)', () => {
    const result = CreateVisitorSchema.safeParse({
      first_name: 'John',
      last_name: 'Doe',
      church_id: 'injected-id',
    })
    expect(result.success).toBe(false)
  })

  it('rejects first_name exceeding max length', () => {
    const result = CreateVisitorSchema.safeParse({
      first_name: 'a'.repeat(101),
      last_name: 'Doe',
    })
    expect(result.success).toBe(false)
  })
})

describe('UpdateVisitorSchema', () => {
  it('accepts partial update with only status', () => {
    const result = UpdateVisitorSchema.safeParse({
      status: 'contacted',
    })
    expect(result.success).toBe(true)
  })

  it('rejects invalid status', () => {
    const result = UpdateVisitorSchema.safeParse({
      status: 'invalid_status',
    })
    expect(result.success).toBe(false)
  })

  it('accepts valid UUID for assigned_to', () => {
    const result = UpdateVisitorSchema.safeParse({
      assigned_to: '550e8400-e29b-41d4-a716-446655440000',
    })
    expect(result.success).toBe(true)
  })

  it('rejects non-UUID for assigned_to', () => {
    const result = UpdateVisitorSchema.safeParse({
      assigned_to: 'not-a-uuid',
    })
    expect(result.success).toBe(false)
  })
})

describe('CreateAnnouncementSchema', () => {
  it('accepts valid announcement', () => {
    const result = CreateAnnouncementSchema.safeParse({
      title: 'Sunday Service Update',
    })
    expect(result.success).toBe(true)
  })

  it('applies defaults for status and is_pinned', () => {
    const result = CreateAnnouncementSchema.safeParse({
      title: 'Test',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.status).toBe('draft')
      expect(result.data.is_pinned).toBe(false)
    }
  })

  it('rejects empty title', () => {
    const result = CreateAnnouncementSchema.safeParse({
      title: '',
    })
    expect(result.success).toBe(false)
  })

  it('validates status enum', () => {
    const result = CreateAnnouncementSchema.safeParse({
      title: 'Test',
      status: 'invalid',
    })
    expect(result.success).toBe(false)
  })

  it('accepts all valid statuses', () => {
    for (const status of ['draft', 'published', 'archived']) {
      const result = CreateAnnouncementSchema.safeParse({
        title: 'Test',
        status,
      })
      expect(result.success).toBe(true)
    }
  })

  it('strips unknown fields', () => {
    const result = CreateAnnouncementSchema.safeParse({
      title: 'Test',
      church_id: 'injected',
      created_by: 'injected',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect((result.data as Record<string, unknown>).church_id).toBeUndefined()
      expect((result.data as Record<string, unknown>).created_by).toBeUndefined()
    }
  })
})

describe('UpdateAnnouncementSchema', () => {
  it('accepts empty object (all fields optional)', () => {
    const result = UpdateAnnouncementSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('accepts partial updates', () => {
    const result = UpdateAnnouncementSchema.safeParse({
      is_pinned: true,
    })
    expect(result.success).toBe(true)
  })
})

describe('CreateEventSchema', () => {
  it('accepts valid event', () => {
    const result = CreateEventSchema.safeParse({
      title: 'Christmas Service',
      event_type: 'worship',
      starts_at: '2025-12-25T10:00:00Z',
    })
    expect(result.success).toBe(true)
  })

  it('rejects missing starts_at', () => {
    const result = CreateEventSchema.safeParse({
      title: 'Test',
      event_type: 'worship',
    })
    expect(result.success).toBe(false)
  })

  it('rejects invalid datetime format for starts_at', () => {
    const result = CreateEventSchema.safeParse({
      title: 'Test',
      event_type: 'worship',
      starts_at: 'not-a-date',
    })
    expect(result.success).toBe(false)
  })

  it('applies boolean defaults', () => {
    const result = CreateEventSchema.safeParse({
      title: 'Test',
      event_type: 'worship',
      starts_at: '2025-12-25T10:00:00Z',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.is_public).toBe(false)
      expect(result.data.registration_required).toBe(false)
      expect(result.data.status).toBe('draft')
    }
  })

  it('validates capacity is positive integer', () => {
    const negResult = CreateEventSchema.safeParse({
      title: 'Test',
      event_type: 'worship',
      starts_at: '2025-12-25T10:00:00Z',
      capacity: -5,
    })
    expect(negResult.success).toBe(false)

    const floatResult = CreateEventSchema.safeParse({
      title: 'Test',
      event_type: 'worship',
      starts_at: '2025-12-25T10:00:00Z',
      capacity: 2.5,
    })
    expect(floatResult.success).toBe(false)
  })
})

describe('CreateGatheringSchema', () => {
  it('accepts valid gathering', () => {
    const result = CreateGatheringSchema.safeParse({
      group_id: '550e8400-e29b-41d4-a716-446655440000',
      scheduled_at: '2025-06-15T18:00:00Z',
    })
    expect(result.success).toBe(true)
  })

  it('rejects non-UUID group_id', () => {
    const result = CreateGatheringSchema.safeParse({
      group_id: 'not-a-uuid',
      scheduled_at: '2025-06-15T18:00:00Z',
    })
    expect(result.success).toBe(false)
  })

  it('rejects invalid scheduled_at', () => {
    const result = CreateGatheringSchema.safeParse({
      group_id: '550e8400-e29b-41d4-a716-446655440000',
      scheduled_at: 'tomorrow',
    })
    expect(result.success).toBe(false)
  })
})

describe('CreateServingSlotSchema', () => {
  it('accepts valid slot', () => {
    const result = CreateServingSlotSchema.safeParse({
      serving_area_id: '550e8400-e29b-41d4-a716-446655440000',
      title: 'Usher - Morning Service',
      date: '2025-06-15',
    })
    expect(result.success).toBe(true)
  })

  it('validates max_volunteers bounds', () => {
    const tooLow = CreateServingSlotSchema.safeParse({
      serving_area_id: '550e8400-e29b-41d4-a716-446655440000',
      title: 'Test',
      date: '2025-06-15',
      max_volunteers: 0,
    })
    expect(tooLow.success).toBe(false)

    const tooHigh = CreateServingSlotSchema.safeParse({
      serving_area_id: '550e8400-e29b-41d4-a716-446655440000',
      title: 'Test',
      date: '2025-06-15',
      max_volunteers: 501,
    })
    expect(tooHigh.success).toBe(false)

    const valid = CreateServingSlotSchema.safeParse({
      serving_area_id: '550e8400-e29b-41d4-a716-446655440000',
      title: 'Test',
      date: '2025-06-15',
      max_volunteers: 10,
    })
    expect(valid.success).toBe(true)
  })
})

describe('SendNotificationSchema', () => {
  it('accepts valid notification', () => {
    const result = SendNotificationSchema.safeParse({
      scope: 'all_members',
      title: 'New Announcement',
      body: 'Check out the latest update',
      channels: ['in_app'],
    })
    expect(result.success).toBe(true)
  })

  it('rejects empty channels array', () => {
    const result = SendNotificationSchema.safeParse({
      scope: 'all_members',
      title: 'Test',
      body: 'Test body',
      channels: [],
    })
    expect(result.success).toBe(false)
  })

  it('rejects invalid channel value', () => {
    const result = SendNotificationSchema.safeParse({
      scope: 'all_members',
      title: 'Test',
      body: 'Test body',
      channels: ['sms'],
    })
    expect(result.success).toBe(false)
  })

  it('accepts multiple valid channels', () => {
    const result = SendNotificationSchema.safeParse({
      scope: 'all_members',
      title: 'Test',
      body: 'Test body',
      channels: ['whatsapp', 'email', 'in_app'],
    })
    expect(result.success).toBe(true)
  })
})

describe('UpdateProfileSchema', () => {
  it('accepts empty object (all fields optional)', () => {
    const result = UpdateProfileSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('validates role enum', () => {
    const valid = UpdateProfileSchema.safeParse({ role: 'ministry_leader' })
    expect(valid.success).toBe(true)

    const invalid = UpdateProfileSchema.safeParse({ role: 'admin' })
    expect(invalid.success).toBe(false)
  })

  it('validates gender enum', () => {
    const valid = UpdateProfileSchema.safeParse({ gender: 'male' })
    expect(valid.success).toBe(true)

    const invalid = UpdateProfileSchema.safeParse({ gender: 'other' })
    expect(invalid.success).toBe(false)
  })

  it('validates notification_pref enum', () => {
    for (const pref of ['whatsapp', 'sms', 'email', 'all', 'none']) {
      const result = UpdateProfileSchema.safeParse({ notification_pref: pref })
      expect(result.success).toBe(true)
    }
  })

  it('validates email format', () => {
    const valid = UpdateProfileSchema.safeParse({ email: 'test@example.com' })
    expect(valid.success).toBe(true)

    const invalid = UpdateProfileSchema.safeParse({ email: 'not-email' })
    expect(invalid.success).toBe(false)
  })

  it('validates photo_url is a URL', () => {
    const valid = UpdateProfileSchema.safeParse({ photo_url: 'https://example.com/photo.jpg' })
    expect(valid.success).toBe(true)

    const invalid = UpdateProfileSchema.safeParse({ photo_url: 'not-a-url' })
    expect(invalid.success).toBe(false)
  })

  it('strips unknown fields (mass assignment protection)', () => {
    const result = UpdateProfileSchema.safeParse({
      first_name: 'John',
      church_id: 'injected-id',
      id: 'injected-id',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect((result.data as Record<string, unknown>).church_id).toBeUndefined()
      expect((result.data as Record<string, unknown>).id).toBeUndefined()
    }
  })
})
