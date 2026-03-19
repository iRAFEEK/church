/**
 * Converts Coptic Reader keyboard encoding to Unicode Coptic script.
 *
 * Coptic Reader stores text in a Latin-based encoding where ASCII characters
 * map to Coptic Unicode letters (Bohairic dialect). For example:
 *   "Qen v~ran m~Viwt" → "Ϧⲉⲛ ⲫ̄ⲣⲁⲛ ⲙ̄Ⲫⲓⲱⲧ" (In the name of the Father)
 */
const COPTIC_MAP: Record<string, string> = {
  a: 'ⲁ', A: 'Ⲁ',
  b: 'ⲃ', B: 'Ⲃ',
  g: 'ⲅ', G: 'Ⲅ',
  d: 'ⲇ', D: 'Ⲇ',
  e: 'ⲉ', E: 'Ⲉ',
  v: 'ⲫ', V: 'Ⲫ',  // phi (Father - Ⲫⲓⲱⲧ)
  z: 'ⲍ', Z: 'Ⲍ',
  h: 'ϩ', H: 'Ϩ',  // hori
  y: 'ⲑ', Y: 'Ⲑ',  // thetha
  q: 'ϧ', Q: 'Ϧ',  // khei
  i: 'ⲓ', I: 'Ⲓ',
  k: 'ⲕ', K: 'Ⲕ',
  l: 'ⲗ', L: 'Ⲗ',
  m: 'ⲙ', M: 'Ⲙ',
  n: 'ⲛ', N: 'Ⲛ',
  x: 'ⲝ', X: 'Ⲝ',  // ksi
  o: 'ⲟ', O: 'Ⲟ',
  p: 'ⲡ', P: 'Ⲡ',
  r: 'ⲣ', R: 'Ⲣ',
  c: 'ⲥ', C: 'Ⲥ',  // sima
  t: 'ⲧ', T: 'Ⲧ',
  u: 'ⲩ', U: 'Ⲩ',
  f: 'ϥ', F: 'Ϥ',  // fai (Coptic F)
  w: 'ⲱ', W: 'Ⲱ',  // omega
  s: 'ϣ', S: 'Ϣ',  // shai
  j: 'ϫ', J: 'Ϫ',  // djandja
  '/': 'ⲏ',        // eta (used as alternate)
  ']': 'ϯ',        // ti
  ',': 'ϭ',        // tchima (comma key maps to ϭ in this encoding)
  '~': '\u0305',   // combining overline (abbreviation mark)
}

export function convertCopticEncoding(text: string): string {
  return text.split('').map(ch => COPTIC_MAP[ch] ?? ch).join('')
}
