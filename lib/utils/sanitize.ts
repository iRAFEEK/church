/**
 * Escape special characters for PostgREST/PostgreSQL LIKE patterns.
 * Prevents filter injection via %, _, and backslash in user-provided search terms.
 * Also strips commas and dots that could break PostgREST .or() filter syntax.
 */
export function sanitizeLikePattern(input: string): string {
  return input
    .replace(/\\/g, '\\\\')  // escape backslash first
    .replace(/%/g, '\\%')     // escape LIKE wildcard %
    .replace(/_/g, '\\_')     // escape LIKE wildcard _
    .replace(/[.,()]/g, '')   // strip chars that break PostgREST .or() syntax
}
