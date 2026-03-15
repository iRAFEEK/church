import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: vi.fn(),
}))
vi.mock('@/lib/api/rate-limit', () => ({
  rateLimitSensitive: vi.fn().mockReturnValue(null),
}))

import { POST } from '../route'
import { createAdminClient } from '@/lib/supabase/server'

// ---------------------------------------------------------------------------
// Constants & helpers
// ---------------------------------------------------------------------------

const CHURCH_ID = 'church-uuid-1'
const USER_ID = 'user-uuid-1'

function makeRequest(body: Record<string, unknown>) {
  return new NextRequest(new URL('/api/churches/register', 'http://localhost:3000'), {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

const validBody = {
  email: 'admin@church.org',
  password: 'secret123',
  churchNameAr: 'كنيسة الاختبار',
  country: 'EG',
  timezone: 'Africa/Cairo',
}

/**
 * Builds a mock Supabase admin client.
 *
 * Each table's mock chain can be overridden individually.
 */
function buildMockSupabase(overrides: {
  churchInsertReturn?: { data: unknown; error: unknown }
  authCreateReturn?: { data: { user: unknown }; error: unknown }
  profileUpdateReturn?: { error: unknown }
  userChurchesInsertReturn?: { error: unknown }
  leadersInsertReturn?: { error: unknown }
  churchDeleteReturn?: { error: unknown }
} = {}) {
  const {
    churchInsertReturn = { data: { id: CHURCH_ID }, error: null },
    authCreateReturn = { data: { user: { id: USER_ID } }, error: null },
    profileUpdateReturn = { error: null },
    userChurchesInsertReturn = { error: null },
    leadersInsertReturn = { error: null },
    churchDeleteReturn = { error: null },
  } = overrides

  // Track calls for assertions
  const churchInsertFn = vi.fn()
  const profileUpdateFn = vi.fn()
  const profileEqFn = vi.fn().mockResolvedValue(profileUpdateReturn)
  const userChurchesInsertFn = vi.fn().mockResolvedValue(userChurchesInsertReturn)
  const leadersInsertFn = vi.fn().mockResolvedValue(leadersInsertReturn)
  const churchDeleteEqFn = vi.fn().mockResolvedValue(churchDeleteReturn)
  const churchDeleteFn = vi.fn().mockReturnValue({ eq: churchDeleteEqFn })

  // churches insert chain: insert(...).select('id').single()
  const churchSingleFn = vi.fn().mockResolvedValue(churchInsertReturn)
  const churchSelectFn = vi.fn().mockReturnValue({ single: churchSingleFn })
  churchInsertFn.mockReturnValue({ select: churchSelectFn })

  // profiles update chain: update(...).eq(...)
  profileUpdateFn.mockReturnValue({ eq: profileEqFn })

  const from = vi.fn().mockImplementation((table: string) => {
    switch (table) {
      case 'churches':
        return { insert: churchInsertFn, delete: churchDeleteFn }
      case 'profiles':
        return { update: profileUpdateFn }
      case 'user_churches':
        return { insert: userChurchesInsertFn }
      case 'church_leaders':
        return { insert: leadersInsertFn }
      default:
        return {}
    }
  })

  const createUserFn = vi.fn().mockResolvedValue(authCreateReturn)

  const supabase = {
    from,
    auth: { admin: { createUser: createUserFn } },
    // expose individual mocks for assertions
    _mocks: {
      churchInsertFn,
      profileUpdateFn,
      profileEqFn,
      userChurchesInsertFn,
      leadersInsertFn,
      churchDeleteFn,
      churchDeleteEqFn,
      createUserFn,
    },
  }

  return supabase
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('POST /api/churches/register', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // 1. Returns 422 when email is missing (Zod validation)
  it('returns 422 when email is missing', async () => {
    const { email: _email, ...body } = validBody
    const res = await POST(makeRequest(body))

    expect(res.status).toBe(422)
    const json = await res.json()
    expect(json.error).toMatch(/validation failed/i)
  })

  // 2. Returns 422 when churchNameAr is missing (Zod validation)
  it('returns 422 when churchNameAr is missing', async () => {
    const { churchNameAr: _name, ...body } = validBody
    const res = await POST(makeRequest(body))

    expect(res.status).toBe(422)
    const json = await res.json()
    expect(json.error).toMatch(/validation failed/i)
  })

  // 3. Returns 422 when password is too short (min 8 chars)
  it('returns 422 when password is shorter than 8 characters', async () => {
    const res = await POST(makeRequest({ ...validBody, password: '1234567' }))

    expect(res.status).toBe(422)
    const json = await res.json()
    expect(json.error).toMatch(/validation failed/i)
  })

  // 4. Returns 201 on successful registration with correct churchId
  it('returns 201 on successful registration with correct churchId', async () => {
    const mock = buildMockSupabase()
    vi.mocked(createAdminClient).mockResolvedValue(mock as never)

    const res = await POST(makeRequest(validBody))

    expect(res.status).toBe(201)
    const json = await res.json()
    expect(json).toEqual({ success: true, churchId: CHURCH_ID })
  })

  // 5. Creates church with correct fields
  it('creates church with correct fields (name, name_ar, country, timezone, primary_language)', async () => {
    const mock = buildMockSupabase()
    vi.mocked(createAdminClient).mockResolvedValue(mock as never)

    await POST(makeRequest({ ...validBody, churchNameEn: 'Test Church' }))

    expect(mock._mocks.churchInsertFn).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Test Church',
        name_ar: 'كنيسة الاختبار',
        country: 'EG',
        timezone: 'Africa/Cairo',
        primary_language: 'ar',
      }),
    )
  })

  // 6. Creates auth user with email_confirm and church_id in metadata
  it('creates auth user with email_confirm: true and church_id in metadata', async () => {
    const mock = buildMockSupabase()
    vi.mocked(createAdminClient).mockResolvedValue(mock as never)

    await POST(makeRequest(validBody))

    expect(mock._mocks.createUserFn).toHaveBeenCalledWith({
      email: 'admin@church.org',
      password: 'secret123',
      email_confirm: true,
      user_metadata: { church_id: CHURCH_ID },
    })
  })

  // 7. Upgrades profile to super_admin role
  it('upgrades profile to super_admin role', async () => {
    const mock = buildMockSupabase()
    vi.mocked(createAdminClient).mockResolvedValue(mock as never)

    await POST(makeRequest(validBody))

    expect(mock._mocks.profileUpdateFn).toHaveBeenCalledWith(
      expect.objectContaining({
        role: 'super_admin',
        onboarding_completed: true,
      }),
    )
    expect(mock._mocks.profileEqFn).toHaveBeenCalledWith('id', USER_ID)
  })

  // 8. Inserts user_churches with super_admin role
  it('inserts user_churches with super_admin role and correct church_id', async () => {
    const mock = buildMockSupabase()
    vi.mocked(createAdminClient).mockResolvedValue(mock as never)

    await POST(makeRequest(validBody))

    expect(mock._mocks.userChurchesInsertFn).toHaveBeenCalledWith({
      user_id: USER_ID,
      church_id: CHURCH_ID,
      role: 'super_admin',
    })
  })

  // 9. Returns 409 when email is already registered
  it('returns 409 when email is already registered', async () => {
    const mock = buildMockSupabase({
      authCreateReturn: {
        data: { user: null },
        error: { message: 'User already been registered' },
      },
    })
    vi.mocked(createAdminClient).mockResolvedValue(mock as never)

    const res = await POST(makeRequest(validBody))

    expect(res.status).toBe(409)
    const json = await res.json()
    expect(json.error).toMatch(/already registered/i)
  })

  // 10. Rolls back church creation on auth failure
  it('rolls back church creation on auth failure', async () => {
    const mock = buildMockSupabase({
      authCreateReturn: {
        data: { user: null },
        error: { message: 'Some unexpected auth error' },
      },
    })
    vi.mocked(createAdminClient).mockResolvedValue(mock as never)

    const res = await POST(makeRequest(validBody))

    expect(res.status).toBe(500)
    // Verify the church was deleted (rollback)
    expect(mock._mocks.churchDeleteFn).toHaveBeenCalled()
    expect(mock._mocks.churchDeleteEqFn).toHaveBeenCalledWith('id', CHURCH_ID)
  })

  // 11. Inserts church leaders when provided
  it('inserts church leaders when provided', async () => {
    const mock = buildMockSupabase()
    vi.mocked(createAdminClient).mockResolvedValue(mock as never)

    const leaders = [
      { name: 'Pastor John', nameAr: 'القس يوحنا', title: 'Senior Pastor', titleAr: 'القس الرئيسي' },
      { name: 'Deacon Mark', nameAr: 'الشماس مرقس', title: 'Deacon', titleAr: 'شماس' },
    ]

    await POST(makeRequest({ ...validBody, leaders }))

    expect(mock._mocks.leadersInsertFn).toHaveBeenCalledWith([
      expect.objectContaining({
        church_id: CHURCH_ID,
        name: 'Pastor John',
        name_ar: 'القس يوحنا',
        title: 'Senior Pastor',
        title_ar: 'القس الرئيسي',
        display_order: 0,
        is_active: true,
      }),
      expect.objectContaining({
        church_id: CHURCH_ID,
        name: 'Deacon Mark',
        name_ar: 'الشماس مرقس',
        title: 'Deacon',
        title_ar: 'شماس',
        display_order: 1,
        is_active: true,
      }),
    ])
  })

  // 12. Defaults primary_language to 'ar' when not specified
  it("defaults primary_language to 'ar' when not specified", async () => {
    const mock = buildMockSupabase()
    vi.mocked(createAdminClient).mockResolvedValue(mock as never)

    await POST(makeRequest(validBody)) // no primaryLanguage in validBody

    expect(mock._mocks.churchInsertFn).toHaveBeenCalledWith(
      expect.objectContaining({ primary_language: 'ar' }),
    )
  })
})
