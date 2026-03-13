import { describe, it, expect } from 'vitest'
import { CreateGroupSchema, UpdateGroupSchema } from '@/lib/schemas/group'
import { UpdateMinistrySchema } from '@/lib/schemas/ministry'
import { UpdatePrayerRequestSchema } from '@/lib/schemas/prayer'
import { CreateSongSchema, UpdateSongSchema } from '@/lib/schemas/song'
import { CreateChurchNeedSchema, UpdateChurchNeedSchema, CreateNeedResponseSchema, UpdateNeedResponseStatusSchema, CreateNeedMessageSchema } from '@/lib/schemas/church-need'
import { updateRoleDefaultsSchema, updateUserPermissionsSchema } from '@/lib/schemas/permission'

// ── Group Schema ────────────────────────────────────────────────────────────

describe('CreateGroupSchema', () => {
  const VALID = { name: 'Alpha Group', type: 'small_group' as const }

  it('accepts valid data with only required fields', () => {
    expect(CreateGroupSchema.safeParse(VALID).success).toBe(true)
  })

  it('accepts all optional fields', () => {
    const full = {
      ...VALID,
      name_ar: 'مجموعة ألفا',
      ministry_id: crypto.randomUUID(),
      leader_id: crypto.randomUUID(),
      co_leader_id: crypto.randomUUID(),
      meeting_day: 'Friday',
      meeting_time: '19:00',
      meeting_location: 'Room 201',
      meeting_location_ar: 'غرفة 201',
      meeting_frequency: 'weekly' as const,
      max_members: 15,
      is_open: true,
      is_active: true,
    }
    expect(CreateGroupSchema.safeParse(full).success).toBe(true)
  })

  it('rejects missing name', () => {
    const r = CreateGroupSchema.safeParse({ type: 'small_group' })
    expect(r.success).toBe(false)
  })

  it('rejects empty name', () => {
    const r = CreateGroupSchema.safeParse({ name: '', type: 'small_group' })
    expect(r.success).toBe(false)
  })

  it('rejects missing type', () => {
    const r = CreateGroupSchema.safeParse({ name: 'Test' })
    expect(r.success).toBe(false)
  })

  it('rejects invalid type enum', () => {
    const r = CreateGroupSchema.safeParse({ name: 'Test', type: 'invalid_type' })
    expect(r.success).toBe(false)
  })

  it('accepts all valid type enums', () => {
    const types = ['small_group', 'youth', 'women', 'men', 'family', 'prayer', 'other']
    for (const type of types) {
      expect(CreateGroupSchema.safeParse({ name: 'Test', type }).success).toBe(true)
    }
  })

  it('rejects non-UUID leader_id', () => {
    const r = CreateGroupSchema.safeParse({ ...VALID, leader_id: 'not-uuid' })
    expect(r.success).toBe(false)
  })

  it('rejects max_members below 1', () => {
    const r = CreateGroupSchema.safeParse({ ...VALID, max_members: 0 })
    expect(r.success).toBe(false)
  })

  it('rejects max_members above 1000', () => {
    const r = CreateGroupSchema.safeParse({ ...VALID, max_members: 1001 })
    expect(r.success).toBe(false)
  })

  it('defaults meeting_frequency to weekly', () => {
    const r = CreateGroupSchema.parse(VALID)
    expect(r.meeting_frequency).toBe('weekly')
  })
})

describe('UpdateGroupSchema', () => {
  it('accepts partial updates', () => {
    expect(UpdateGroupSchema.safeParse({ name: 'New Name' }).success).toBe(true)
  })

  it('accepts empty object', () => {
    expect(UpdateGroupSchema.safeParse({}).success).toBe(true)
  })
})

// ── Ministry Schema ─────────────────────────────────────────────────────────

describe('UpdateMinistrySchema', () => {
  it('accepts valid partial update', () => {
    expect(UpdateMinistrySchema.safeParse({ name: 'Worship' }).success).toBe(true)
  })

  it('accepts empty object', () => {
    expect(UpdateMinistrySchema.safeParse({}).success).toBe(true)
  })

  it('rejects empty name string', () => {
    const r = UpdateMinistrySchema.safeParse({ name: '' })
    expect(r.success).toBe(false)
  })

  it('rejects non-UUID leader_id', () => {
    const r = UpdateMinistrySchema.safeParse({ leader_id: 'not-uuid' })
    expect(r.success).toBe(false)
  })

  it('accepts UUID leader_id', () => {
    const r = UpdateMinistrySchema.safeParse({ leader_id: crypto.randomUUID() })
    expect(r.success).toBe(true)
  })

  it('accepts nullable leader_id', () => {
    const r = UpdateMinistrySchema.safeParse({ leader_id: null })
    expect(r.success).toBe(true)
  })

  it('rejects invalid photo_url', () => {
    const r = UpdateMinistrySchema.safeParse({ photo_url: 'not-a-url' })
    expect(r.success).toBe(false)
  })
})

// ── Prayer Schema ───────────────────────────────────────────────────────────

describe('UpdatePrayerRequestSchema', () => {
  it('accepts valid status update', () => {
    expect(UpdatePrayerRequestSchema.safeParse({ status: 'praying' }).success).toBe(true)
  })

  it('accepts all valid status enums', () => {
    for (const s of ['pending', 'praying', 'answered', 'archived']) {
      expect(UpdatePrayerRequestSchema.safeParse({ status: s }).success).toBe(true)
    }
  })

  it('rejects invalid status', () => {
    const r = UpdatePrayerRequestSchema.safeParse({ status: 'deleted' })
    expect(r.success).toBe(false)
  })

  it('accepts assigned_to as UUID', () => {
    expect(UpdatePrayerRequestSchema.safeParse({ assigned_to: crypto.randomUUID() }).success).toBe(true)
  })

  it('accepts assigned_to as null', () => {
    expect(UpdatePrayerRequestSchema.safeParse({ assigned_to: null }).success).toBe(true)
  })

  it('rejects non-UUID assigned_to', () => {
    const r = UpdatePrayerRequestSchema.safeParse({ assigned_to: 'not-uuid' })
    expect(r.success).toBe(false)
  })

  it('rejects content over 2000 characters', () => {
    const r = UpdatePrayerRequestSchema.safeParse({ content: 'x'.repeat(2001) })
    expect(r.success).toBe(false)
  })
})

// ── Song Schema ─────────────────────────────────────────────────────────────

describe('CreateSongSchema', () => {
  const VALID = { title: 'Amazing Grace' }

  it('accepts minimal valid data', () => {
    expect(CreateSongSchema.safeParse(VALID).success).toBe(true)
  })

  it('rejects missing title', () => {
    expect(CreateSongSchema.safeParse({}).success).toBe(false)
  })

  it('rejects empty title', () => {
    expect(CreateSongSchema.safeParse({ title: '' }).success).toBe(false)
  })

  it('defaults display_settings', () => {
    const r = CreateSongSchema.parse(VALID)
    expect(r.display_settings).toBeDefined()
    expect(r.display_settings.bg_color).toBe('#000000')
    expect(r.display_settings.text_color).toBe('#ffffff')
    expect(r.display_settings.font_family).toBe('sans')
    expect(r.display_settings.font_size).toBe(48)
  })

  it('accepts custom display settings', () => {
    const r = CreateSongSchema.safeParse({
      title: 'Test',
      display_settings: {
        bg_color: '#112233',
        text_color: '#aabbcc',
        font_family: 'arabic',
        font_size: 60,
      },
    })
    expect(r.success).toBe(true)
  })

  it('rejects invalid font_family enum', () => {
    const r = CreateSongSchema.safeParse({
      title: 'Test',
      display_settings: { font_family: 'comic_sans' },
    })
    expect(r.success).toBe(false)
  })

  it('rejects font_size below 12', () => {
    const r = CreateSongSchema.safeParse({
      title: 'Test',
      display_settings: { font_size: 8 },
    })
    expect(r.success).toBe(false)
  })

  it('rejects font_size above 120', () => {
    const r = CreateSongSchema.safeParse({
      title: 'Test',
      display_settings: { font_size: 200 },
    })
    expect(r.success).toBe(false)
  })

  it('accepts tags array', () => {
    const r = CreateSongSchema.safeParse({ title: 'Test', tags: ['worship', 'arabic'] })
    expect(r.success).toBe(true)
  })

  it('rejects more than 20 tags', () => {
    const tags = Array.from({ length: 21 }, (_, i) => `tag${i}`)
    const r = CreateSongSchema.safeParse({ title: 'Test', tags })
    expect(r.success).toBe(false)
  })

  it('defaults is_active to true', () => {
    const r = CreateSongSchema.parse(VALID)
    expect(r.is_active).toBe(true)
  })
})

// ── Church Need Schema ──────────────────────────────────────────────────────

describe('CreateChurchNeedSchema', () => {
  const VALID = { title: 'Need projector', category: 'electronics' as const }

  it('accepts valid data with only required fields', () => {
    expect(CreateChurchNeedSchema.safeParse(VALID).success).toBe(true)
  })

  it('rejects missing title', () => {
    expect(CreateChurchNeedSchema.safeParse({ category: 'electronics' }).success).toBe(false)
  })

  it('rejects empty title', () => {
    expect(CreateChurchNeedSchema.safeParse({ title: '', category: 'electronics' }).success).toBe(false)
  })

  it('rejects missing category', () => {
    expect(CreateChurchNeedSchema.safeParse({ title: 'Need' }).success).toBe(false)
  })

  it('rejects invalid category', () => {
    expect(CreateChurchNeedSchema.safeParse({ title: 'Need', category: 'weapons' }).success).toBe(false)
  })

  it('accepts all valid categories', () => {
    const cats = ['furniture', 'electronics', 'supplies', 'food', 'clothing', 'building', 'vehicle', 'educational', 'medical', 'financial', 'volunteer', 'other']
    for (const c of cats) {
      expect(CreateChurchNeedSchema.safeParse({ title: 'Test', category: c }).success).toBe(true)
    }
  })

  it('accepts all valid urgencies', () => {
    for (const u of ['low', 'medium', 'high', 'critical']) {
      expect(CreateChurchNeedSchema.safeParse({ ...VALID, urgency: u }).success).toBe(true)
    }
  })

  it('defaults quantity to 1', () => {
    const r = CreateChurchNeedSchema.parse(VALID)
    expect(r.quantity).toBe(1)
  })

  it('defaults urgency to medium', () => {
    const r = CreateChurchNeedSchema.parse(VALID)
    expect(r.urgency).toBe('medium')
  })

  it('rejects quantity below 1', () => {
    expect(CreateChurchNeedSchema.safeParse({ ...VALID, quantity: 0 }).success).toBe(false)
  })

  it('rejects invalid contact_email', () => {
    expect(CreateChurchNeedSchema.safeParse({ ...VALID, contact_email: 'not-email' }).success).toBe(false)
  })

  it('rejects invalid image_url', () => {
    expect(CreateChurchNeedSchema.safeParse({ ...VALID, image_url: 'not-a-url' }).success).toBe(false)
  })
})

describe('UpdateChurchNeedSchema', () => {
  it('accepts status update', () => {
    const r = UpdateChurchNeedSchema.safeParse({ status: 'fulfilled' })
    expect(r.success).toBe(true)
  })

  it('rejects invalid status', () => {
    const r = UpdateChurchNeedSchema.safeParse({ status: 'deleted' })
    expect(r.success).toBe(false)
  })

  it('accepts all valid statuses', () => {
    for (const s of ['open', 'in_progress', 'fulfilled', 'closed']) {
      expect(UpdateChurchNeedSchema.safeParse({ status: s }).success).toBe(true)
    }
  })
})

describe('CreateNeedResponseSchema', () => {
  it('accepts valid response', () => {
    expect(CreateNeedResponseSchema.safeParse({ message: 'We can help!' }).success).toBe(true)
  })

  it('rejects empty message', () => {
    expect(CreateNeedResponseSchema.safeParse({ message: '' }).success).toBe(false)
  })

  it('rejects missing message', () => {
    expect(CreateNeedResponseSchema.safeParse({}).success).toBe(false)
  })

  it('rejects message over 2000 chars', () => {
    expect(CreateNeedResponseSchema.safeParse({ message: 'x'.repeat(2001) }).success).toBe(false)
  })
})

describe('UpdateNeedResponseStatusSchema', () => {
  it('accepts accepted status', () => {
    expect(UpdateNeedResponseStatusSchema.safeParse({ status: 'accepted' }).success).toBe(true)
  })

  it('accepts declined status', () => {
    expect(UpdateNeedResponseStatusSchema.safeParse({ status: 'declined' }).success).toBe(true)
  })

  it('rejects invalid status', () => {
    expect(UpdateNeedResponseStatusSchema.safeParse({ status: 'pending' }).success).toBe(false)
  })
})

describe('CreateNeedMessageSchema', () => {
  it('accepts valid message', () => {
    expect(CreateNeedMessageSchema.safeParse({ message: 'Hello!' }).success).toBe(true)
  })

  it('rejects empty message', () => {
    expect(CreateNeedMessageSchema.safeParse({ message: '' }).success).toBe(false)
  })
})

// ── Permission Schema ───────────────────────────────────────────────────────

describe('updateRoleDefaultsSchema', () => {
  it('accepts valid role defaults update', () => {
    const r = updateRoleDefaultsSchema.safeParse({
      role: 'member',
      permissions: { can_view_members: true, can_manage_songs: false },
    })
    expect(r.success).toBe(true)
  })

  it('rejects invalid role', () => {
    const r = updateRoleDefaultsSchema.safeParse({
      role: 'super_admin', // not allowed in schema — super_admin defaults are hardcoded
      permissions: {},
    })
    expect(r.success).toBe(false)
  })

  it('accepts all valid roles', () => {
    for (const role of ['member', 'group_leader', 'ministry_leader']) {
      expect(updateRoleDefaultsSchema.safeParse({ role, permissions: {} }).success).toBe(true)
    }
  })

  it('rejects missing role', () => {
    expect(updateRoleDefaultsSchema.safeParse({ permissions: {} }).success).toBe(false)
  })

  it('rejects missing permissions', () => {
    expect(updateRoleDefaultsSchema.safeParse({ role: 'member' }).success).toBe(false)
  })
})

describe('updateUserPermissionsSchema', () => {
  it('accepts valid permissions map', () => {
    const r = updateUserPermissionsSchema.safeParse({
      permissions: { can_view_members: true },
    })
    expect(r.success).toBe(true)
  })

  it('accepts empty permissions map', () => {
    const r = updateUserPermissionsSchema.safeParse({ permissions: {} })
    expect(r.success).toBe(true)
  })

  it('rejects missing permissions', () => {
    expect(updateUserPermissionsSchema.safeParse({}).success).toBe(false)
  })
})
