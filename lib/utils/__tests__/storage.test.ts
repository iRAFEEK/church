import { describe, it, expect } from 'vitest'
import { getAvatarUrl } from '@/lib/utils/storage'

describe('getAvatarUrl', () => {
  it('returns undefined for null', () => {
    expect(getAvatarUrl(null)).toBeUndefined()
  })

  it('returns undefined for undefined', () => {
    expect(getAvatarUrl(undefined)).toBeUndefined()
  })

  it('returns external URL unchanged', () => {
    const url = 'https://example.com/avatar.png'
    expect(getAvatarUrl(url)).toBe(url)
  })

  it('adds transform params to Supabase URL', () => {
    const url = 'https://abc.supabase.co/storage/v1/object/public/avatars/photo.jpg'
    expect(getAvatarUrl(url)).toBe(
      `${url}?width=48&height=48&resize=cover&quality=75`
    )
  })

  it('uses & separator when URL already has query params', () => {
    const url = 'https://abc.supabase.co/storage/v1/object/public/avatars/photo.jpg?token=xyz'
    expect(getAvatarUrl(url)).toBe(
      `${url}&width=48&height=48&resize=cover&quality=75`
    )
  })
})
