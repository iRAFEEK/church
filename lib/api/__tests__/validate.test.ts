import { describe, it, expect } from 'vitest'
import { z } from 'zod'
import { validate } from '@/lib/api/validate'
import { ValidationError } from '@/lib/api/handler'

describe('validate()', () => {
  const schema = z.object({
    name: z.string().min(1, 'Name is required'),
    amount: z.number().positive('Must be positive'),
    email: z.string().email().optional(),
  })

  it('returns parsed data for valid input', () => {
    const result = validate(schema, { name: 'Test', amount: 100 })
    expect(result).toEqual({ name: 'Test', amount: 100 })
  })

  it('throws ValidationError for invalid input', () => {
    expect(() => validate(schema, { name: '', amount: -1 }))
      .toThrow(ValidationError)
  })

  it('includes field-level error details', () => {
    try {
      validate(schema, { name: '', amount: -1 })
      expect.fail('Should have thrown')
    } catch (err) {
      expect(err).toBeInstanceOf(ValidationError)
      const ve = err as ValidationError
      expect(ve.fields).toBeDefined()
      expect(ve.fields!['name']).toBeDefined()
      expect(ve.fields!['amount']).toBeDefined()
    }
  })

  it('strips unknown fields (Zod default)', () => {
    const result = validate(schema, { name: 'Test', amount: 50, unknown_field: 'hack' })
    expect(result).toEqual({ name: 'Test', amount: 50 })
    expect((result as Record<string, unknown>).unknown_field).toBeUndefined()
  })

  it('returns defaults from schema', () => {
    const withDefaults = z.object({
      name: z.string(),
      currency: z.string().default('EGP'),
    })
    const result = validate(withDefaults, { name: 'Test' })
    expect(result.currency).toBe('EGP')
  })
})
