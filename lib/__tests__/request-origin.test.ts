import { describe, it, expect } from 'vitest'
import { resolveAppOrigin } from '@/lib/request-origin'

describe('resolveAppOrigin', () => {
  it('uses the request host when env is unset (the Vercel prod case)', () => {
    expect(resolveAppOrigin(undefined, 'church-omega-nine.vercel.app', 'https'))
      .toBe('https://church-omega-nine.vercel.app')
  })

  it('uses the request host when env is the localhost default', () => {
    expect(resolveAppOrigin('http://localhost:3000', 'church-omega-nine.vercel.app', 'https'))
      .toBe('https://church-omega-nine.vercel.app')
  })

  it('prefers an explicit non-localhost env URL (canonical domain override)', () => {
    expect(resolveAppOrigin('https://ekklesia.church', 'church-omega-nine.vercel.app', 'https'))
      .toBe('https://ekklesia.church')
  })

  it('strips a trailing slash from the env URL', () => {
    expect(resolveAppOrigin('https://ekklesia.church/', null, null)).toBe('https://ekklesia.church')
  })

  it('defaults to https for a non-localhost host without a proto header', () => {
    expect(resolveAppOrigin(undefined, 'example.com', null)).toBe('https://example.com')
  })

  it('uses http for a localhost host without a proto header (local dev)', () => {
    expect(resolveAppOrigin(undefined, 'localhost:3000', null)).toBe('http://localhost:3000')
    expect(resolveAppOrigin(undefined, '127.0.0.1:4100', null)).toBe('http://127.0.0.1:4100')
  })

  it('falls back to localhost when nothing is available', () => {
    expect(resolveAppOrigin(undefined, null, null)).toBe('http://localhost:3000')
  })
})
