import { z } from 'zod'

export const CreateFiscalYearSchema = z.object({
  name: z.string().min(1).max(200),
  name_ar: z.string().max(200).optional().nullable(),
  start_date: z.string().min(1, 'Start date is required'),
  end_date: z.string().min(1, 'End date is required'),
  is_current: z.boolean().default(false),
}).refine(
  (data) => new Date(data.end_date) > new Date(data.start_date),
  { message: 'End date must be after start date', path: ['end_date'] }
)
