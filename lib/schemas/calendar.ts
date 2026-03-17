import { z } from 'zod'

const dateRegex = /^\d{4}-\d{2}-\d{2}$/

export const calendarQuerySchema = z.object({
  start: z.string().regex(dateRegex, 'Must be YYYY-MM-DD'),
  end: z.string().regex(dateRegex, 'Must be YYYY-MM-DD'),
})

export type CalendarQuery = z.infer<typeof calendarQuerySchema>
