/**
 * Shared utilities for song slide operations.
 * Used by SongsTable, SongPresenter, and PresenterSearch.
 */

/** Split lyrics into presentation slides (separated by blank lines) */
export function splitIntoSlides(lyrics: string): string[] {
  return lyrics.split(/\n\s*\n/).filter(s => s.trim())
}

/**
 * Find which slide contains the given search text.
 * Returns the 0-based slide index, or -1 if not found.
 * Strips HTML tags from the search text before matching.
 */
export function findSlideForText(lyrics: string, searchText: string): number {
  if (!lyrics || !searchText) return -1

  const slides = splitIntoSlides(lyrics)
  // Strip HTML tags (from ts_headline <mark> tags) and normalize
  const plain = searchText.replace(/<[^>]+>/g, '').trim().toLowerCase()
  if (!plain) return -1

  for (let i = 0; i < slides.length; i++) {
    if (slides[i].toLowerCase().includes(plain)) {
      return i
    }
  }

  // Fallback: try matching individual words (for partial snippet matches)
  const words = plain.split(/\s+/).filter(w => w.length > 2)
  if (words.length === 0) return -1

  let bestIndex = -1
  let bestCount = 0
  for (let i = 0; i < slides.length; i++) {
    const slideLower = slides[i].toLowerCase()
    const matchCount = words.filter(w => slideLower.includes(w)).length
    if (matchCount > bestCount) {
      bestCount = matchCount
      bestIndex = i
    }
  }

  return bestCount >= Math.ceil(words.length / 2) ? bestIndex : -1
}
