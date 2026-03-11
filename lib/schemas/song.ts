import { z } from 'zod'

export const CreateSongSchema = z.object({
  title: z.string().min(1).max(200),
  title_ar: z.string().max(200).optional().nullable(),
  artist: z.string().max(200).optional().nullable(),
  artist_ar: z.string().max(200).optional().nullable(),
  lyrics: z.string().max(10000).optional().nullable(),
  lyrics_ar: z.string().max(10000).optional().nullable(),
  tags: z.array(z.string().max(50)).max(20).default([]),
  display_settings: z.object({
    bg_color: z.string().max(20).default('#000000'),
    bg_image: z.string().url().optional().nullable(),
    text_color: z.string().max(20).default('#ffffff'),
    font_family: z.enum(['sans', 'serif', 'mono', 'arabic']).default('sans'),
    font_size: z.number().int().min(12).max(120).default(48),
  }).default({}),
  is_active: z.boolean().default(true),
})

export const UpdateSongSchema = CreateSongSchema.partial()
