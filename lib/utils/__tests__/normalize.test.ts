import { describe, it, expect } from 'vitest'
import { normalizeSearch } from '../normalize'

describe('normalizeSearch', () => {
  it('lowercases English text', () => {
    expect(normalizeSearch('Hello World')).toBe('hello world')
  })

  it('trims whitespace', () => {
    expect(normalizeSearch('  hello  ')).toBe('hello')
  })

  it('strips Arabic diacritics (tashkeel)', () => {
    // Fathah, Dammah, Kasrah, Sukun, Tanween
    expect(normalizeSearch('مُحَمَّد')).toBe('محمد')
  })

  it('unifies alef variants to plain alef', () => {
    // Alef with hamza above (أ), below (إ), madda (آ), wasla (ٱ)
    expect(normalizeSearch('أحمد')).toBe('احمد')
    expect(normalizeSearch('إبراهيم')).toBe('ابراهيم')
    expect(normalizeSearch('آية')).toBe('اية')
    expect(normalizeSearch('ٱلله')).toBe('الله')
  })

  it('handles mixed Arabic and English', () => {
    expect(normalizeSearch('Church كنيسة')).toBe('church كنيسة')
  })

  it('handles empty string', () => {
    expect(normalizeSearch('')).toBe('')
  })

  it('preserves Arabic text without diacritics', () => {
    expect(normalizeSearch('كنيسة القاهرة')).toBe('كنيسة القاهرة')
  })

  it('strips multiple diacritics on same character', () => {
    // Shadda + Fathah on the same letter
    expect(normalizeSearch('محمَّد')).toBe('محمد')
  })
})
