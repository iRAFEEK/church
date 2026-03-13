import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { timeAgo } from '../time-ago'

describe('timeAgo', () => {
  beforeEach(() => {
    // Fix Date.now to 2025-06-01T12:00:00Z
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-06-01T12:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('English locale', () => {
    it('returns "just now" for < 1 minute', () => {
      const date = new Date('2025-06-01T11:59:30Z').toISOString()
      expect(timeAgo(date, 'en')).toBe('just now')
    })

    it('returns minutes ago', () => {
      const date = new Date('2025-06-01T11:55:00Z').toISOString()
      expect(timeAgo(date, 'en')).toBe('5m ago')
    })

    it('returns hours ago', () => {
      const date = new Date('2025-06-01T09:00:00Z').toISOString()
      expect(timeAgo(date, 'en')).toBe('3h ago')
    })

    it('returns days ago', () => {
      const date = new Date('2025-05-30T12:00:00Z').toISOString()
      expect(timeAgo(date, 'en')).toBe('2d ago')
    })
  })

  describe('Arabic locale', () => {
    it('returns Arabic "now" for < 1 minute', () => {
      const date = new Date('2025-06-01T11:59:30Z').toISOString()
      expect(timeAgo(date, 'ar')).toBe('الآن')
    })

    it('returns Arabic minutes', () => {
      const date = new Date('2025-06-01T11:55:00Z').toISOString()
      expect(timeAgo(date, 'ar')).toBe('منذ 5 دقيقة')
    })

    it('returns Arabic hours', () => {
      const date = new Date('2025-06-01T09:00:00Z').toISOString()
      expect(timeAgo(date, 'ar')).toBe('منذ 3 ساعة')
    })

    it('returns Arabic days', () => {
      const date = new Date('2025-05-30T12:00:00Z').toISOString()
      expect(timeAgo(date, 'ar')).toBe('منذ 2 يوم')
    })

    it('works with ar-eg locale', () => {
      const date = new Date('2025-06-01T11:55:00Z').toISOString()
      expect(timeAgo(date, 'ar-eg')).toBe('منذ 5 دقيقة')
    })
  })
})
