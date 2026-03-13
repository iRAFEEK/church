import { describe, it, expect } from 'vitest'
import { TEMPLATES, interpolate } from '@/lib/messaging/templates'

describe('interpolate', () => {
  it('replaces a single {param}', () => {
    expect(interpolate('Hello {name}', { name: 'John' })).toBe('Hello John')
  })

  it('replaces multiple {param}s', () => {
    const result = interpolate('{groupName} meets at {time} in {location}', {
      groupName: 'Youth',
      time: '7pm',
      location: 'Hall A',
    })
    expect(result).toBe('Youth meets at 7pm in Hall A')
  })

  it('leaves unreplaced params as {key}', () => {
    expect(interpolate('Hello {name}, welcome to {place}', { name: 'John' })).toBe(
      'Hello John, welcome to {place}'
    )
  })

  it('handles empty params object', () => {
    expect(interpolate('Hello {name}', {})).toBe('Hello {name}')
  })

  it('handles empty template string', () => {
    expect(interpolate('', { name: 'John' })).toBe('')
  })

  it('handles special regex chars in values', () => {
    expect(interpolate('Price: {amount}', { amount: '$100.00 (USD)' })).toBe(
      'Price: $100.00 (USD)'
    )
  })

  it('replaces with empty string values correctly', () => {
    expect(interpolate('Hello {name}!', { name: '' })).toBe('Hello !')
  })
})

describe('TEMPLATES', () => {
  const templateKeys = Object.keys(TEMPLATES)

  it('has exactly 12 entries', () => {
    expect(templateKeys).toHaveLength(12)
  })

  it('every template has all 7 required fields', () => {
    const requiredFields = [
      'whatsappTemplate',
      'titleEn',
      'titleAr',
      'bodyEn',
      'bodyAr',
      'emailSubjectEn',
      'emailSubjectAr',
    ] as const

    for (const key of templateKeys) {
      const template = TEMPLATES[key]
      for (const field of requiredFields) {
        expect(template[field], `${key}.${field} should be defined`).toBeDefined()
        expect(typeof template[field], `${key}.${field} should be a string`).toBe('string')
      }
    }
  })

  it('Arabic templates contain Arabic characters', () => {
    const arabicRegex = /[\u0600-\u06FF]/
    for (const key of templateKeys) {
      const template = TEMPLATES[key]
      expect(arabicRegex.test(template.titleAr), `${key}.titleAr should contain Arabic`).toBe(true)
      expect(arabicRegex.test(template.bodyAr), `${key}.bodyAr should contain Arabic`).toBe(true)
      expect(
        arabicRegex.test(template.emailSubjectAr),
        `${key}.emailSubjectAr should contain Arabic`
      ).toBe(true)
    }
  })

  it('has no duplicate whatsappTemplate values', () => {
    const values = templateKeys.map((k) => TEMPLATES[k].whatsappTemplate)
    const unique = new Set(values)
    expect(unique.size).toBe(values.length)
  })

  it('all bodies have at least one {param} placeholder', () => {
    const placeholderRegex = /\{\w+\}/
    for (const key of templateKeys) {
      const template = TEMPLATES[key]
      expect(
        placeholderRegex.test(template.bodyEn),
        `${key}.bodyEn should have a placeholder`
      ).toBe(true)
      expect(
        placeholderRegex.test(template.bodyAr),
        `${key}.bodyAr should have a placeholder`
      ).toBe(true)
    }
  })

  it('titles and email subjects are non-empty strings', () => {
    for (const key of templateKeys) {
      const template = TEMPLATES[key]
      expect(template.titleEn.length, `${key}.titleEn should be non-empty`).toBeGreaterThan(0)
      expect(template.titleAr.length, `${key}.titleAr should be non-empty`).toBeGreaterThan(0)
      expect(
        template.emailSubjectEn.length,
        `${key}.emailSubjectEn should be non-empty`
      ).toBeGreaterThan(0)
      expect(
        template.emailSubjectAr.length,
        `${key}.emailSubjectAr should be non-empty`
      ).toBeGreaterThan(0)
    }
  })

  it('each template key matches its whatsappTemplate value', () => {
    for (const key of templateKeys) {
      expect(
        TEMPLATES[key].whatsappTemplate,
        `${key} should match its whatsappTemplate`
      ).toBe(key)
    }
  })
})
