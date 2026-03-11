// ARCH: Centralized validation helper. Use with Zod schemas in API routes.
// Throws ValidationError (caught by apiHandler) with field-level error details.

import { z } from 'zod'
import { ValidationError } from './handler'

export function validate<T>(schema: z.ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data)
  if (!result.success) {
    const fields = Object.fromEntries(
      result.error.errors.map(e => [e.path.join('.'), e.message])
    )
    throw new ValidationError('Validation failed', fields)
  }
  return result.data
}
