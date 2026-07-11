import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock the service-role client + logger before importing the module under test.
const maybeSingle = vi.fn()
vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: vi.fn(async () => ({
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle }) }) }),
  })),
}))
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn() } }))

import { isPlatformAdmin, isEnvPlatformAdmin } from '@/lib/platform'

describe('isPlatformAdmin (env bootstrap OR platform_admins table)', () => {
  const orig = process.env.PLATFORM_ADMIN_EMAILS

  beforeEach(() => {
    maybeSingle.mockReset()
    maybeSingle.mockResolvedValue({ data: null })
  })
  afterEach(() => {
    if (orig === undefined) delete process.env.PLATFORM_ADMIN_EMAILS
    else process.env.PLATFORM_ADMIN_EMAILS = orig
  })

  it('returns false for empty/null email', async () => {
    expect(await isPlatformAdmin('')).toBe(false)
    expect(await isPlatformAdmin(null)).toBe(false)
    expect(await isPlatformAdmin(undefined)).toBe(false)
  })

  it('matches an env bootstrap owner (case-insensitive) without a DB lookup', async () => {
    process.env.PLATFORM_ADMIN_EMAILS = 'owner@ekklesia.app, second@ekklesia.app'
    expect(await isPlatformAdmin('Owner@Ekklesia.App')).toBe(true)
    expect(maybeSingle).not.toHaveBeenCalled()
  })

  it('matches a table-managed approver when not an env owner', async () => {
    process.env.PLATFORM_ADMIN_EMAILS = 'owner@ekklesia.app'
    maybeSingle.mockResolvedValue({ data: { email: 'helper@church.org' } })
    expect(await isPlatformAdmin('helper@church.org')).toBe(true)
  })

  it('returns false when neither env nor table match', async () => {
    process.env.PLATFORM_ADMIN_EMAILS = 'owner@ekklesia.app'
    maybeSingle.mockResolvedValue({ data: null })
    expect(await isPlatformAdmin('stranger@x.com')).toBe(false)
  })

  it('isEnvPlatformAdmin only checks the env allowlist (for owner-protection guard)', () => {
    process.env.PLATFORM_ADMIN_EMAILS = 'owner@ekklesia.app'
    expect(isEnvPlatformAdmin('owner@ekklesia.app')).toBe(true)
    expect(isEnvPlatformAdmin('OWNER@ekklesia.app')).toBe(true)
    expect(isEnvPlatformAdmin('helper@church.org')).toBe(false)
    expect(isEnvPlatformAdmin(null)).toBe(false)
  })
})
