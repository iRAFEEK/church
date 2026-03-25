import { z } from 'zod'

export const conferenceResourceSchema = z.object({
  name: z.string().min(1).max(200),
  name_ar: z.string().max(200).optional(),
  resource_type: z.enum(['equipment', 'supply', 'food', 'transport', 'other']).default('other'),
  quantity_needed: z.number().int().positive().default(1),
  quantity_confirmed: z.number().int().min(0).optional().nullable(),
  status: z.enum(['needed', 'requested', 'confirmed', 'delivered']).optional(),
  estimated_cost: z.number().min(0).optional().nullable(),
  notes: z.string().max(500).optional(),
  notes_ar: z.string().max(500).optional(),
  team_id: z.string().uuid().optional().nullable(),
  card_id: z.string().uuid().optional().nullable(),
})
