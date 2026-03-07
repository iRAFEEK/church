/**
 * Returns a Supabase Storage URL with image transform params for optimized avatar delivery.
 * Only applies transforms to Supabase-hosted URLs; passes through external URLs unchanged.
 */
export function getAvatarUrl(url: string | null | undefined, size: number = 48): string | undefined {
  if (!url) return undefined
  if (!url.includes('supabase')) return url
  const sep = url.includes('?') ? '&' : '?'
  return `${url}${sep}width=${size}&height=${size}&resize=cover&quality=75`
}
