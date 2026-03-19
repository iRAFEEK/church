import { NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { z } from 'zod'
import { apiHandler } from '@/lib/api/handler'
import { validate } from '@/lib/api/validate'
import { createAdminClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'

const SyncReadingsSchema = z.object({
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD'),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD'),
})

// Katameros API types
interface KataPassage {
  bookTranslation: string
  chapter: number
  ref: string
  verses: { number: number; text: string }[]
}

interface KataReading {
  title: string | null
  introduction: string | null
  conclusion: string | null
  passages: KataPassage[]
}

interface KataSubSection {
  title: string
  introduction: string | null
  readings: KataReading[]
}

interface KataSection {
  title: string
  subSections?: KataSubSection[]
  readings?: KataReading[]
}

interface KataResponse {
  title: string | null
  periodInfo: string | null
  copticDate: string | null
  sections: KataSection[]
}

function formatDate(d: Date): string {
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  return `${dd}-${mm}-${yyyy}`
}

function extractReadings(sections: KataSection[]): Array<{
  type: string
  reference: string
  text_ar: string
}> {
  const result: Array<{ type: string; reference: string; text_ar: string }> = []

  for (const section of sections) {
    const sectionTitle = section.title
    const subSections = section.subSections || []

    // Some sections have readings directly, others have subSections
    const allReadings = section.readings
      ? [{ title: sectionTitle, readings: section.readings }]
      : subSections.map(sub => ({ title: `${sectionTitle} - ${sub.title}`, readings: sub.readings }))

    for (const group of allReadings) {
      for (const reading of group.readings) {
        for (const passage of reading.passages) {
          const reference = `${passage.bookTranslation} ${passage.chapter}:${passage.ref}`
          const text = passage.verses.map(v => v.text).join(' ')
          result.push({
            type: group.title,
            reference,
            text_ar: text,
          })
        }
      }
    }
  }

  return result
}

function extractSynaxarium(sections: KataSection[]): string | null {
  for (const section of sections) {
    if (section.title?.includes('سنكسار') || section.title?.includes('Synaxar')) {
      const htmlParts: string[] = []
      const subs = section.subSections || []
      for (const sub of subs) {
        for (const reading of sub.readings) {
          for (const passage of reading.passages) {
            for (const verse of passage.verses) {
              if (verse.text) htmlParts.push(verse.text)
            }
          }
        }
      }
      if (htmlParts.length > 0) return htmlParts.join('\n')
    }
  }
  return null
}

// POST /api/liturgy/readings/sync
// Fetches readings from katameros-api and upserts into lectionary_readings
export const POST = apiHandler(async ({ req }) => {
  const body = await req.json()
  const { start_date, end_date } = validate(SyncReadingsSchema, body)

  const start = new Date(start_date)
  const end = new Date(end_date)

  if (end < start) {
    return NextResponse.json({ error: 'end_date must be after start_date' }, { status: 422 })
  }

  const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays > 90) {
    return NextResponse.json({ error: 'Date range must not exceed 90 days' }, { status: 422 })
  }

  const supabase = await createAdminClient()

  // Get coptic tradition ID
  const { data: tradition } = await supabase
    .from('liturgical_traditions')
    .select('id')
    .eq('slug', 'coptic')
    .single()

  if (!tradition) {
    return NextResponse.json({ error: 'Coptic tradition not found' }, { status: 500 })
  }

  let synced = 0
  let failed = 0

  const current = new Date(start)
  while (current <= end) {
    const isoDate = current.toISOString().split('T')[0]
    const apiDate = formatDate(current) // DD-MM-YYYY for Katameros API

    try {
      // Katameros API: GET /readings/gregorian/{DD-MM-YYYY}?languageId=3&bibleId=11
      // languageId=3 = Arabic, bibleId=11 = Arabic Van Dyck with diacritics
      const response = await fetch(
        `https://api.katameros.app/readings/gregorian/${apiDate}?languageId=3&bibleId=11`,
        { signal: AbortSignal.timeout(15000) }
      )

      if (!response.ok) {
        logger.warn('Katameros API returned non-OK', {
          module: 'liturgy',
          date: isoDate,
          status: response.status,
        })
        failed++
        current.setDate(current.getDate() + 1)
        continue
      }

      const apiData = (await response.json()) as KataResponse

      // Extract structured readings
      const readings = extractReadings(apiData.sections)
      const synaxarium = extractSynaxarium(apiData.sections)

      // Determine season from periodInfo
      const season = apiData.periodInfo || null
      const occasion = apiData.title || null

      const { error } = await supabase
        .from('lectionary_readings')
        .upsert(
          {
            tradition_id: tradition.id,
            reading_date: isoDate,
            coptic_date: apiData.copticDate || null,
            season,
            occasion: occasion,
            occasion_ar: occasion,
            readings: JSON.stringify(readings),
            synaxarium_ar: synaxarium,
            synaxarium_en: null,
          },
          { onConflict: 'tradition_id,reading_date' }
        )

      if (error) {
        logger.error('Failed to upsert reading', {
          module: 'liturgy',
          date: isoDate,
          error,
        })
        failed++
      } else {
        synced++
        revalidateTag(`liturgy-readings-${tradition.id}-${isoDate}`)
      }
    } catch (err) {
      logger.error('Katameros API fetch error', {
        module: 'liturgy',
        date: isoDate,
        error: err,
      })
      failed++
    }

    // Small delay to avoid rate limiting the external API
    await new Promise(resolve => setTimeout(resolve, 200))
    current.setDate(current.getDate() + 1)
  }

  return NextResponse.json(
    { synced, failed, total: diffDays + 1 },
    { status: 200 }
  )
}, { requireRoles: ['super_admin'], rateLimit: 'strict' })
