import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { isFeatureEnabled, isFeatureEnabledForChurch } from '../features'
import type { FeatureFlag } from '../features'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a chainable Supabase-style mock that resolves to `result`. */
function createSupabaseMock(result: { data: { enabled: boolean } | null; error: Error | null }) {
  const single = vi.fn().mockResolvedValue(result)
  const eqChurch = vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single }) })
  const select = vi.fn().mockReturnValue({ eq: eqChurch })
  const from = vi.fn().mockReturnValue({ select })

  return { from, select, eqChurch, single }
}

/** Build a chainable mock that rejects (simulates DB error). */
function createFailingSupabaseMock() {
  const single = vi.fn().mockRejectedValue(new Error('DB connection lost'))
  const eqChurch = vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single }) })
  const select = vi.fn().mockReturnValue({ eq: eqChurch })
  const from = vi.fn().mockReturnValue({ select })

  return { from }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('features', () => {
  const savedEnv = { ...process.env }

  beforeEach(() => {
    // Reset env to a clean slate before each test
    process.env = { ...savedEnv }
  })

  afterEach(() => {
    process.env = savedEnv
  })

  // -----------------------------------------------------------------------
  // isFeatureEnabled — default values
  // -----------------------------------------------------------------------

  describe('isFeatureEnabled — defaults', () => {
    it('returns false for advanced_reporting by default', () => {
      expect(isFeatureEnabled('advanced_reporting')).toBe(false)
    })

    it('returns false for sms_notifications by default', () => {
      expect(isFeatureEnabled('sms_notifications')).toBe(false)
    })

    it('returns false for api_access by default', () => {
      expect(isFeatureEnabled('api_access')).toBe(false)
    })

    it('returns false for custom_fields by default', () => {
      expect(isFeatureEnabled('custom_fields')).toBe(false)
    })

    it('returns false for audit_log_ui by default', () => {
      expect(isFeatureEnabled('audit_log_ui')).toBe(false)
    })

    it('returns true for outreach_module by default', () => {
      expect(isFeatureEnabled('outreach_module')).toBe(true)
    })

    it('returns true for song_presenter by default', () => {
      expect(isFeatureEnabled('song_presenter')).toBe(true)
    })
  })

  // -----------------------------------------------------------------------
  // isFeatureEnabled — env overrides
  // -----------------------------------------------------------------------

  describe('isFeatureEnabled — env overrides', () => {
    it('returns true when env var is set to "true" for a default-false flag', () => {
      process.env.NEXT_PUBLIC_FEATURE_ADVANCED_REPORTING = 'true'
      expect(isFeatureEnabled('advanced_reporting')).toBe(true)
    })

    it('returns false when env var is set to "false" overriding a default-true flag', () => {
      process.env.NEXT_PUBLIC_FEATURE_OUTREACH_MODULE = 'false'
      expect(isFeatureEnabled('outreach_module')).toBe(false)
    })
  })

  // -----------------------------------------------------------------------
  // isFeatureEnabledForChurch
  // -----------------------------------------------------------------------

  describe('isFeatureEnabledForChurch', () => {
    const churchId = 'church-abc-123'

    it('returns the DB value when a row is found', async () => {
      const mock = createSupabaseMock({ data: { enabled: true }, error: null })

      // Use a default-false flag so the function actually queries the DB
      const result = await isFeatureEnabledForChurch(
        { from: mock.from },
        'advanced_reporting',
        churchId
      )

      expect(result).toBe(true)
      expect(mock.from).toHaveBeenCalledWith('church_features')
      expect(mock.select).toHaveBeenCalledWith('enabled')
    })

    it('falls back to the default when the DB query throws', async () => {
      const mock = createFailingSupabaseMock()

      const result = await isFeatureEnabledForChurch(
        { from: mock.from },
        'sms_notifications',
        churchId
      )

      // sms_notifications defaults to false
      expect(result).toBe(false)
    })

    it('falls back to the default when no row is found (data is null)', async () => {
      const mock = createSupabaseMock({ data: null, error: null })

      const result = await isFeatureEnabledForChurch(
        { from: mock.from },
        'api_access',
        churchId
      )

      // api_access defaults to false
      expect(result).toBe(false)
    })
  })
})
