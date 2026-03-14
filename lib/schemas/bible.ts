import { z } from 'zod'

export const CreateBookmarkSchema = z.object({
  bible_id: z.string().min(1).max(50),
  book_id: z.string().min(1).max(50),
  chapter_id: z.string().min(1).max(50),
  verse_id: z.string().max(50).optional().nullable(),
  reference_label: z.string().min(1).max(200),
  reference_label_ar: z.string().max(200).optional().nullable(),
  note: z.string().max(2000).optional().nullable(),
})

export const UpdateBookmarkSchema = z.object({
  note: z.string().max(2000).optional().nullable(),
})

export const CreateHighlightSchema = z.object({
  bible_id: z.string().min(1).max(50),
  book_id: z.string().min(1).max(50),
  chapter_id: z.string().min(1).max(50),
  verse_id: z.string().min(1).max(50),
  reference_label: z.string().min(1).max(200),
  reference_label_ar: z.string().max(200).optional().nullable(),
  color: z.string().min(1).max(20),
})

export const UpdateHighlightSchema = z.object({
  color: z.string().min(1).max(20),
})
