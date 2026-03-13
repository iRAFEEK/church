import { describe, it, expect } from 'vitest'
import { sanitizeLikePattern } from '@/lib/utils/sanitize'

describe('sanitizeLikePattern', () => {
  it('escapes backslashes', () => {
    expect(sanitizeLikePattern('a\\b')).toBe('a\\\\b')
  })

  it('escapes % wildcard', () => {
    expect(sanitizeLikePattern('100%')).toBe('100\\%')
  })

  it('escapes _ wildcard', () => {
    expect(sanitizeLikePattern('user_name')).toBe('user\\_name')
  })

  it('strips dots, commas, and parentheses', () => {
    expect(sanitizeLikePattern('hello.world,foo(bar)')).toBe('helloworldfoobar')
  })

  it('passes through normal text unchanged', () => {
    expect(sanitizeLikePattern('church name')).toBe('church name')
  })

  it('handles multiple special chars in one string', () => {
    expect(sanitizeLikePattern('50%_off (sale).')).toBe('50\\%\\_off sale')
  })
})
