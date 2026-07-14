import { describe, it, expect } from 'vitest'
import { SECTIONS } from '../manifest.mjs'
import { EN_CATEGORIES, EN_SECTIONS } from '../translations-en.mjs'

// ── Manifest ↔ English translations parity ─────────────────────────────────
// docs/visual-guide/gen-app-data.mjs silently omits the optional `en`/`titleEn`
// fields when a manifest section has no matching EN_SECTIONS entry (or a step
// index is missing) — the UI then falls back to Arabic without any warning.
// These tests turn that silent drift into a loud failure: whenever a section
// or step is added to manifest.mjs, translations-en.mjs must be updated in
// lockstep (see PR-001 follow-up in the coordination log).

interface ManifestStep {
  icon: string
  ar: string
}
interface ManifestSection {
  n: number
  icon: string
  t: string
  steps: ManifestStep[]
}
interface EnSection {
  t: string
  steps: string[]
}

const sections = SECTIONS as ManifestSection[]
const enSections = EN_SECTIONS as Record<string, EnSection>
const enCategories = EN_CATEGORIES as Record<string, string>

// The 7 category ids defined in docs/visual-guide/gen-app-data.mjs (CATS).
const EXPECTED_CATEGORY_IDS = ['welcome', 'start', 'member', 'leader', 'admin', 'settings', 'ref']

describe('visual guide — manifest sanity', () => {
  it('manifest has sections with unique numeric ids and non-empty steps', () => {
    expect(sections.length).toBeGreaterThan(0)
    const ids = sections.map((s) => String(s.n))
    expect(new Set(ids).size).toBe(ids.length)
    for (const s of sections) {
      expect(Array.isArray(s.steps), `section ${s.n} has no steps array`).toBe(true)
      expect(s.steps.length, `section ${s.n} has zero steps`).toBeGreaterThan(0)
    }
  })
})

describe('visual guide — EN_SECTIONS ↔ SECTIONS parity', () => {
  it('(a) every manifest section has an EN_SECTIONS entry', () => {
    const missing = sections
      .map((s) => String(s.n))
      .filter((n) => !(n in enSections))
    expect(missing, `sections missing English translations: ${missing.join(', ')}`).toEqual([])
  })

  it('(b) every EN_SECTIONS entry has exactly as many step sentences as the manifest section has steps', () => {
    const mismatches: string[] = []
    for (const s of sections) {
      const en = enSections[String(s.n)]
      if (!en) continue // covered by (a)
      if (!Array.isArray(en.steps) || en.steps.length !== s.steps.length) {
        mismatches.push(
          `section ${s.n}: manifest has ${s.steps.length} steps, EN has ${en.steps?.length ?? 'none'}`
        )
      }
    }
    expect(mismatches, mismatches.join('; ')).toEqual([])
  })

  it('(c) EN_SECTIONS has no extra keys that do not exist in the manifest', () => {
    const manifestIds = new Set(sections.map((s) => String(s.n)))
    const extras = Object.keys(enSections).filter((k) => !manifestIds.has(k))
    expect(extras, `orphaned EN_SECTIONS keys (no manifest section): ${extras.join(', ')}`).toEqual([])
  })

  it('(e) every EN section title and every EN step sentence is a non-empty string', () => {
    const problems: string[] = []
    for (const [n, en] of Object.entries(enSections)) {
      if (typeof en.t !== 'string' || en.t.trim() === '') {
        problems.push(`section ${n}: empty/invalid title`)
      }
      for (let i = 0; i < (en.steps?.length ?? 0); i++) {
        const step = en.steps[i]
        if (typeof step !== 'string' || step.trim() === '') {
          problems.push(`section ${n} step ${i}: empty/invalid sentence`)
        }
      }
    }
    expect(problems, problems.join('; ')).toEqual([])
  })
})

describe('visual guide — EN_CATEGORIES ↔ gen-app-data CATS parity', () => {
  it('(d) EN_CATEGORIES has exactly the 7 category ids used by gen-app-data.mjs', () => {
    expect(Object.keys(enCategories).sort()).toEqual([...EXPECTED_CATEGORY_IDS].sort())
  })

  it('(e) every EN category title is a non-empty string', () => {
    for (const id of EXPECTED_CATEGORY_IDS) {
      const title = enCategories[id]
      expect(typeof title, `category ${id} title is not a string`).toBe('string')
      expect(title.trim().length, `category ${id} title is empty`).toBeGreaterThan(0)
    }
  })

  it('(d, guard) the CATS list inside gen-app-data.mjs still uses exactly these 7 ids', async () => {
    // gen-app-data.mjs writes a file on import, so we read its source instead of importing it.
    const { readFileSync } = await import('node:fs')
    const src = readFileSync('docs/visual-guide/gen-app-data.mjs', 'utf-8')
    const idsInSource = [...src.matchAll(/\{ id:'([a-z]+)',\s+icon:/g)].map((m) => m[1])
    expect(idsInSource).toEqual(EXPECTED_CATEGORY_IDS)
  })
})
