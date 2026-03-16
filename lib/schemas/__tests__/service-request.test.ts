import { describe, it, expect } from 'vitest'
import { CreateServiceRequestSchema, UpdateServiceRequestSchema } from '../service-request'

describe('CreateServiceRequestSchema', () => {
  it('validates a valid create request', () => {
    const result = CreateServiceRequestSchema.safeParse({
      requested_role: 'Sound Engineer',
      assigned_to: '550e8400-e29b-41d4-a716-446655440000',
    })
    expect(result.success).toBe(true)
  })

  it('accepts optional notes', () => {
    const result = CreateServiceRequestSchema.safeParse({
      requested_role: 'Usher',
      assigned_to: '550e8400-e29b-41d4-a716-446655440000',
      notes: 'Please confirm by Wednesday',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.notes).toBe('Please confirm by Wednesday')
    }
  })

  it('rejects empty requested_role', () => {
    const result = CreateServiceRequestSchema.safeParse({
      requested_role: '',
      assigned_to: '550e8400-e29b-41d4-a716-446655440000',
    })
    expect(result.success).toBe(false)
  })

  it('rejects invalid UUID for assigned_to', () => {
    const result = CreateServiceRequestSchema.safeParse({
      requested_role: 'Sound Engineer',
      assigned_to: 'not-a-uuid',
    })
    expect(result.success).toBe(false)
  })

  it('rejects missing assigned_to', () => {
    const result = CreateServiceRequestSchema.safeParse({
      requested_role: 'Sound Engineer',
    })
    expect(result.success).toBe(false)
  })

  it('rejects notes over 2000 chars', () => {
    const result = CreateServiceRequestSchema.safeParse({
      requested_role: 'Usher',
      assigned_to: '550e8400-e29b-41d4-a716-446655440000',
      notes: 'a'.repeat(2001),
    })
    expect(result.success).toBe(false)
  })

  it('rejects requested_role over 200 chars', () => {
    const result = CreateServiceRequestSchema.safeParse({
      requested_role: 'a'.repeat(201),
      assigned_to: '550e8400-e29b-41d4-a716-446655440000',
    })
    expect(result.success).toBe(false)
  })
})

describe('UpdateServiceRequestSchema', () => {
  it('validates accepted status', () => {
    const result = UpdateServiceRequestSchema.safeParse({
      status: 'accepted',
    })
    expect(result.success).toBe(true)
  })

  it('validates declined status', () => {
    const result = UpdateServiceRequestSchema.safeParse({
      status: 'declined',
    })
    expect(result.success).toBe(true)
  })

  it('validates reassigned status with reassign_to', () => {
    const result = UpdateServiceRequestSchema.safeParse({
      status: 'reassigned',
      reassign_to: '550e8400-e29b-41d4-a716-446655440000',
    })
    expect(result.success).toBe(true)
  })

  it('validates with optional response_note', () => {
    const result = UpdateServiceRequestSchema.safeParse({
      status: 'declined',
      response_note: 'I am traveling that week',
    })
    expect(result.success).toBe(true)
  })

  it('rejects invalid status', () => {
    const result = UpdateServiceRequestSchema.safeParse({
      status: 'pending',
    })
    expect(result.success).toBe(false)
  })

  it('rejects status "assigned" (not a valid response)', () => {
    const result = UpdateServiceRequestSchema.safeParse({
      status: 'assigned',
    })
    expect(result.success).toBe(false)
  })

  it('rejects response_note over 2000 chars', () => {
    const result = UpdateServiceRequestSchema.safeParse({
      status: 'accepted',
      response_note: 'a'.repeat(2001),
    })
    expect(result.success).toBe(false)
  })

  it('rejects invalid reassign_to UUID', () => {
    const result = UpdateServiceRequestSchema.safeParse({
      status: 'reassigned',
      reassign_to: 'not-valid',
    })
    expect(result.success).toBe(false)
  })
})
