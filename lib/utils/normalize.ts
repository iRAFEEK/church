/**
 * Normalize text for Arabic/English search:
 * lowercases, strips Arabic diacritics, unifies alef variants, trims.
 * Server-safe (no React imports).
 */
export function normalizeSearch(text: string): string {
  return text
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0610-\u061A\u06D6-\u06DC\u06DF-\u06E4\u06E7-\u06E8\u06EA-\u06ED]/g, '')
    .replace(/[ٱأإآ]/g, 'ا')
    .trim()
}
