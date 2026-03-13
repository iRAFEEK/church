import { z } from 'zod'

export const updateRoleDefaultsSchema = z.object({
  role: z.enum(['member', 'group_leader', 'ministry_leader']),
  permissions: z.record(z.string(), z.boolean()),
})

export const updateUserPermissionsSchema = z.object({
  permissions: z.record(z.string(), z.boolean()),
})

export type UpdateRoleDefaultsInput = z.infer<typeof updateRoleDefaultsSchema>
export type UpdateUserPermissionsInput = z.infer<typeof updateUserPermissionsSchema>
