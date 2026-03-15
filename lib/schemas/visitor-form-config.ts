import { z } from 'zod'

export const VISITOR_FORM_FIELD_KEYS = [
  'first_name', 'last_name', 'phone', 'email', 'age_range', 'occupation', 'how_heard',
] as const

export type VisitorFormFieldKey = (typeof VISITOR_FORM_FIELD_KEYS)[number]

export const VisitorFormFieldSchema = z.object({
  key: z.enum(VISITOR_FORM_FIELD_KEYS),
  enabled: z.boolean(),
  required: z.boolean(),
  label: z.string().max(100).optional(),
  label_ar: z.string().max(100).optional(),
})

export const VisitorFormConfigSchema = z.object({
  fields: z
    .array(VisitorFormFieldSchema)
    .min(2)
    .refine(
      (fields) => {
        const firstName = fields.find(f => f.key === 'first_name')
        const lastName = fields.find(f => f.key === 'last_name')
        return firstName?.enabled && firstName?.required && lastName?.enabled && lastName?.required
      },
      { message: 'first_name and last_name must always be enabled and required' }
    ),
})

export type VisitorFormField = z.infer<typeof VisitorFormFieldSchema>
export type VisitorFormConfig = z.infer<typeof VisitorFormConfigSchema>
