import { z } from 'zod'

export const SubscribePushSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  deviceHint: z.string().max(200).optional().nullable(),
})

export const UnsubscribePushSchema = z.object({
  token: z.string().min(1, 'Token is required'),
})
