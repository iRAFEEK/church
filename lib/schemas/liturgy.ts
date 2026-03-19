import { z } from 'zod'

// ─── Bookmark ────────────────────────────────────────────────
export const CreateLiturgicalBookmarkSchema = z.object({
  content_id: z.string().uuid().optional().nullable(),
  hymn_id: z.string().uuid().optional().nullable(),
  note: z.string().max(500).optional().nullable(),
}).refine(
  (data) => (data.content_id != null) !== (data.hymn_id != null),
  { message: 'Exactly one of content_id or hymn_id must be provided' }
)

// ─── Church Settings ─────────────────────────────────────────
export const UpdateChurchLiturgicalSettingsSchema = z.object({
  tradition_id: z.string().uuid(),
  preferred_language: z.enum(['ar', 'en', 'coptic']).default('ar'),
})

// ─── Hymn Search ─────────────────────────────────────────────
export const HymnSearchSchema = z.object({
  q: z.string().max(200).optional(),
  tradition_id: z.string().uuid().optional(),
  season: z.string().max(100).optional(),
  tag: z.string().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
})

// ─── Readings Query ──────────────────────────────────────────
export const ReadingsQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD').optional(),
  tradition_id: z.string().uuid().optional(),
})

// ─── Content Query ───────────────────────────────────────────
export const ContentQuerySchema = z.object({
  section_id: z.string().uuid(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
})

// ─── Sections Query ──────────────────────────────────────────
export const SectionsQuerySchema = z.object({
  category_id: z.string().uuid(),
})

// ─── Categories Query ────────────────────────────────────────
export const CategoriesQuerySchema = z.object({
  tradition_id: z.string().uuid(),
})
