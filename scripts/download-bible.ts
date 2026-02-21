/**
 * Download Bible text from getbible.net API and save as local JSON files.
 * Run once: npx tsx scripts/download-bible.ts
 *
 * Produces:
 *   data/bible/ar-svd.json  — Arabic Smith & Van Dyke (66 books)
 *   data/bible/en-kjva.json — English KJV with Apocrypha (80 books)
 */

import { writeFileSync } from 'fs'
import { join } from 'path'

const API_BASE = 'https://api.getbible.net/v2'

// getbible.net book_nr → USFM code mapping
const BOOK_NR_TO_USFM: Record<number, string> = {
  1: 'GEN', 2: 'EXO', 3: 'LEV', 4: 'NUM', 5: 'DEU',
  6: 'JOS', 7: 'JDG', 8: 'RUT', 9: '1SA', 10: '2SA',
  11: '1KI', 12: '2KI', 13: '1CH', 14: '2CH', 15: 'EZR',
  16: 'NEH', 17: 'EST', 18: 'JOB', 19: 'PSA', 20: 'PRO',
  21: 'ECC', 22: 'SNG', 23: 'ISA', 24: 'JER', 25: 'LAM',
  26: 'EZK', 27: 'DAN', 28: 'HOS', 29: 'JOL', 30: 'AMO',
  31: 'OBA', 32: 'JON', 33: 'MIC', 34: 'NAM', 35: 'HAB',
  36: 'ZEP', 37: 'HAG', 38: 'ZEC', 39: 'MAL',
  40: 'MAT', 41: 'MRK', 42: 'LUK', 43: 'JHN', 44: 'ACT',
  45: 'ROM', 46: '1CO', 47: '2CO', 48: 'GAL', 49: 'EPH',
  50: 'PHP', 51: 'COL', 52: '1TH', 53: '2TH', 54: '1TI',
  55: '2TI', 56: 'TIT', 57: 'PHM', 58: 'HEB', 59: 'JAS',
  60: '1PE', 61: '2PE', 62: '1JN', 63: '2JN', 64: '3JN',
  65: 'JUD', 66: 'REV',
  // Apocrypha (KJVA numbering)
  67: '1ES', 68: '2ES', 69: 'TOB', 70: 'JDT', 71: 'ESG',
  73: 'WIS', 74: 'SIR', 75: 'BAR', 76: 'S3Y', 77: 'SUS',
  78: 'BEL', 79: 'MAN', 80: '1MA', 81: '2MA',
}

// English long names
const BOOK_LONG_NAMES: Record<string, string> = {
  GEN: 'The First Book of Moses, called Genesis',
  EXO: 'The Second Book of Moses, called Exodus',
  LEV: 'The Third Book of Moses, called Leviticus',
  NUM: 'The Fourth Book of Moses, called Numbers',
  DEU: 'The Fifth Book of Moses, called Deuteronomy',
  JOS: 'The Book of Joshua', JDG: 'The Book of Judges', RUT: 'The Book of Ruth',
  '1SA': 'The First Book of Samuel', '2SA': 'The Second Book of Samuel',
  '1KI': 'The First Book of Kings', '2KI': 'The Second Book of Kings',
  '1CH': 'The First Book of Chronicles', '2CH': 'The Second Book of Chronicles',
  EZR: 'The Book of Ezra', NEH: 'The Book of Nehemiah', EST: 'The Book of Esther',
  JOB: 'The Book of Job', PSA: 'The Book of Psalms', PRO: 'The Proverbs',
  ECC: 'Ecclesiastes', SNG: 'The Song of Solomon',
  ISA: 'The Book of the Prophet Isaiah', JER: 'The Book of the Prophet Jeremiah',
  LAM: 'The Lamentations of Jeremiah', EZK: 'The Book of the Prophet Ezekiel',
  DAN: 'The Book of Daniel', HOS: 'Hosea', JOL: 'Joel', AMO: 'Amos',
  OBA: 'Obadiah', JON: 'Jonah', MIC: 'Micah', NAM: 'Nahum',
  HAB: 'Habakkuk', ZEP: 'Zephaniah', HAG: 'Haggai', ZEC: 'Zechariah', MAL: 'Malachi',
  MAT: 'The Gospel According to Matthew', MRK: 'The Gospel According to Mark',
  LUK: 'The Gospel According to Luke', JHN: 'The Gospel According to John',
  ACT: 'The Acts of the Apostles', ROM: 'The Epistle to the Romans',
  '1CO': 'The First Epistle to the Corinthians', '2CO': 'The Second Epistle to the Corinthians',
  GAL: 'The Epistle to the Galatians', EPH: 'The Epistle to the Ephesians',
  PHP: 'The Epistle to the Philippians', COL: 'The Epistle to the Colossians',
  '1TH': 'The First Epistle to the Thessalonians', '2TH': 'The Second Epistle to the Thessalonians',
  '1TI': 'The First Epistle to Timothy', '2TI': 'The Second Epistle to Timothy',
  TIT: 'The Epistle to Titus', PHM: 'The Epistle to Philemon',
  HEB: 'The Epistle to the Hebrews', JAS: 'The Epistle of James',
  '1PE': 'The First Epistle of Peter', '2PE': 'The Second Epistle of Peter',
  '1JN': 'The First Epistle of John', '2JN': 'The Second Epistle of John',
  '3JN': 'The Third Epistle of John', JUD: 'The Epistle of Jude',
  REV: 'The Revelation of John',
  '1ES': '1 Esdras', '2ES': '2 Esdras', TOB: 'Tobit', JDT: 'Judith',
  ESG: 'Additions to Esther', WIS: 'Wisdom of Solomon', SIR: 'Sirach (Ecclesiasticus)',
  BAR: 'Baruch', S3Y: 'Prayer of Azariah', SUS: 'Susanna',
  BEL: 'Bel and the Dragon', MAN: 'Prayer of Manasses',
  '1MA': '1 Maccabees', '2MA': '2 Maccabees',
}

// Arabic long names
const BOOK_LONG_NAMES_AR: Record<string, string> = {
  GEN: 'سفر التكوين', EXO: 'سفر الخروج', LEV: 'سفر اللاويين',
  NUM: 'سفر العدد', DEU: 'سفر التثنية', JOS: 'سفر يشوع',
  JDG: 'سفر القضاة', RUT: 'سفر راعوث',
  '1SA': 'سفر صموئيل الأول', '2SA': 'سفر صموئيل الثاني',
  '1KI': 'سفر الملوك الأول', '2KI': 'سفر الملوك الثاني',
  '1CH': 'سفر أخبار الأيام الأول', '2CH': 'سفر أخبار الأيام الثاني',
  EZR: 'سفر عزرا', NEH: 'سفر نحميا', EST: 'سفر أستير',
  JOB: 'سفر أيوب', PSA: 'سفر المزامير', PRO: 'سفر الأمثال',
  ECC: 'سفر الجامعة', SNG: 'سفر نشيد الأنشاد',
  ISA: 'سفر إشعياء', JER: 'سفر إرميا', LAM: 'سفر مراثي إرميا',
  EZK: 'سفر حزقيال', DAN: 'سفر دانيال', HOS: 'سفر هوشع',
  JOL: 'سفر يوئيل', AMO: 'سفر عاموس', OBA: 'سفر عوبديا',
  JON: 'سفر يونان', MIC: 'سفر ميخا', NAM: 'سفر ناحوم',
  HAB: 'سفر حبقوق', ZEP: 'سفر صفنيا', HAG: 'سفر حجي',
  ZEC: 'سفر زكريا', MAL: 'سفر ملاخي',
  MAT: 'إنجيل متى', MRK: 'إنجيل مرقس', LUK: 'إنجيل لوقا',
  JHN: 'إنجيل يوحنا', ACT: 'سفر أعمال الرسل', ROM: 'رسالة رومية',
  '1CO': 'رسالة كورنثوس الأولى', '2CO': 'رسالة كورنثوس الثانية',
  GAL: 'رسالة غلاطية', EPH: 'رسالة أفسس', PHP: 'رسالة فيلبي',
  COL: 'رسالة كولوسي', '1TH': 'رسالة تسالونيكي الأولى',
  '2TH': 'رسالة تسالونيكي الثانية', '1TI': 'رسالة تيموثاوس الأولى',
  '2TI': 'رسالة تيموثاوس الثانية', TIT: 'رسالة تيطس',
  PHM: 'رسالة فليمون', HEB: 'الرسالة إلى العبرانيين',
  JAS: 'رسالة يعقوب', '1PE': 'رسالة بطرس الأولى',
  '2PE': 'رسالة بطرس الثانية', '1JN': 'رسالة يوحنا الأولى',
  '2JN': 'رسالة يوحنا الثانية', '3JN': 'رسالة يوحنا الثالثة',
  JUD: 'رسالة يهوذا', REV: 'سفر الرؤيا',
}

// Short Arabic book names
const BOOK_SHORT_NAMES_AR: Record<string, string> = {
  GEN: 'تكوين', EXO: 'خروج', LEV: 'لاويين', NUM: 'عدد', DEU: 'تثنية',
  JOS: 'يشوع', JDG: 'قضاة', RUT: 'راعوث',
  '1SA': 'صموئيل الأول', '2SA': 'صموئيل الثاني',
  '1KI': 'ملوك الأول', '2KI': 'ملوك الثاني',
  '1CH': 'أخبار الأيام الأول', '2CH': 'أخبار الأيام الثاني',
  EZR: 'عزرا', NEH: 'نحميا', EST: 'أستير',
  JOB: 'أيوب', PSA: 'مزامير', PRO: 'أمثال', ECC: 'جامعة',
  SNG: 'نشيد الأنشاد', ISA: 'إشعياء', JER: 'إرميا', LAM: 'مراثي',
  EZK: 'حزقيال', DAN: 'دانيال', HOS: 'هوشع', JOL: 'يوئيل',
  AMO: 'عاموس', OBA: 'عوبديا', JON: 'يونان', MIC: 'ميخا',
  NAM: 'ناحوم', HAB: 'حبقوق', ZEP: 'صفنيا',
  HAG: 'حجي', ZEC: 'زكريا', MAL: 'ملاخي',
  MAT: 'متى', MRK: 'مرقس', LUK: 'لوقا', JHN: 'يوحنا',
  ACT: 'أعمال الرسل', ROM: 'رومية',
  '1CO': 'كورنثوس الأولى', '2CO': 'كورنثوس الثانية',
  GAL: 'غلاطية', EPH: 'أفسس', PHP: 'فيلبي', COL: 'كولوسي',
  '1TH': 'تسالونيكي الأولى', '2TH': 'تسالونيكي الثانية',
  '1TI': 'تيموثاوس الأولى', '2TI': 'تيموثاوس الثانية',
  TIT: 'تيطس', PHM: 'فليمون', HEB: 'عبرانيين',
  JAS: 'يعقوب', '1PE': 'بطرس الأولى', '2PE': 'بطرس الثانية',
  '1JN': 'يوحنا الأولى', '2JN': 'يوحنا الثانية', '3JN': 'يوحنا الثالثة',
  JUD: 'يهوذا', REV: 'رؤيا',
}

interface GetBibleBook {
  nr: number
  name: string
  url: string
  sha: string
  chapters: Array<{
    chapter: number
    name: string
    verses: Array<{
      chapter: number
      verse: number
      name: string
      text: string
    }>
  }>
}

interface BibleDataBook {
  id: string
  abbreviation: string
  name: string
  nameLong: string
  sortOrder: number
  chapters: Array<{
    number: number
    reference: string
    verses: Array<{
      number: number
      text: string
    }>
  }>
}

interface BibleData {
  version: {
    id: string
    name: string
    nameLocal: string
    abbreviation: string
    abbreviationLocal: string
    languageId: string
    languageName: string
    languageNameLocal: string
    description: string
    descriptionLocal: string
    copyright: string
  }
  books: BibleDataBook[]
}

async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`)
  return res.json() as Promise<T>
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function downloadTranslation(
  translationKey: string,
  versionMeta: BibleData['version'],
  isArabic: boolean
): Promise<BibleData> {
  console.log(`\nDownloading ${versionMeta.name}...`)

  // Get books list (just metadata, no chapters/verses)
  const booksIndex = await fetchJSON<Record<string, { nr: number; name: string; url: string }>>(
    `${API_BASE}/${translationKey}/books.json`
  )

  const books: BibleDataBook[] = []
  let totalVerses = 0
  let sortOrder = 0

  // Sort books by number
  const sortedEntries = Object.values(booksIndex).sort((a, b) => a.nr - b.nr)

  for (const entry of sortedEntries) {
    const usfm = BOOK_NR_TO_USFM[entry.nr]
    if (!usfm) {
      console.log(`  Skipping unknown book #${entry.nr}: ${entry.name}`)
      continue
    }

    sortOrder++
    console.log(`  [${sortOrder}/${sortedEntries.length}] ${entry.name} (${usfm})...`)

    // Fetch the full book data (all chapters + verses)
    let bookData: GetBibleBook
    try {
      bookData = await fetchJSON<GetBibleBook>(`${API_BASE}/${translationKey}/${entry.nr}.json`)
    } catch (err: any) {
      console.log(`    ERROR: Failed to fetch book: ${err.message}`)
      continue
    }

    const bookName = isArabic
      ? (BOOK_SHORT_NAMES_AR[usfm] || entry.name)
      : entry.name
    const bookNameLong = isArabic
      ? (BOOK_LONG_NAMES_AR[usfm] || entry.name)
      : (BOOK_LONG_NAMES[usfm] || entry.name)

    const chapters: BibleDataBook['chapters'] = []

    for (const ch of bookData.chapters) {
      const reference = isArabic
        ? `${bookName} ${ch.chapter}`
        : `${entry.name} ${ch.chapter}`

      chapters.push({
        number: ch.chapter,
        reference,
        verses: ch.verses.map((v) => ({
          number: v.verse,
          text: v.text.trim(),
        })),
      })

      totalVerses += ch.verses.length
    }

    console.log(`    ${chapters.length} chapters, ${chapters.reduce((s, c) => s + c.verses.length, 0)} verses`)

    books.push({
      id: usfm,
      abbreviation: usfm,
      name: bookName,
      nameLong: bookNameLong,
      sortOrder,
      chapters,
    })

    // Small delay between book fetches to be respectful
    await sleep(200)
  }

  console.log(`\n  Total: ${books.length} books, ${totalVerses} verses`)

  return { version: versionMeta, books }
}

async function main() {
  const dataDir = join(process.cwd(), 'data', 'bible')

  // Download Arabic SVD (66 books)
  const arSvd = await downloadTranslation('arabicsv', {
    id: 'ar-svd',
    name: 'Smith & Van Dyke',
    nameLocal: 'سميث وفاندايك',
    abbreviation: 'SVD',
    abbreviationLocal: 'ف.س',
    languageId: 'ara',
    languageName: 'Arabic',
    languageNameLocal: 'العربية',
    description: 'Arabic Bible - Smith & Van Dyke translation (1865)',
    descriptionLocal: 'الكتاب المقدس - ترجمة سميث وفاندايك',
    copyright: 'Public Domain',
  }, true)

  writeFileSync(join(dataDir, 'ar-svd.json'), JSON.stringify(arSvd, null, 2), 'utf-8')
  console.log(`\nSaved ar-svd.json`)

  // Download KJV with Apocrypha
  const enKjva = await downloadTranslation('kjva', {
    id: 'en-kjva',
    name: 'King James Version (with Apocrypha)',
    nameLocal: 'King James Version (with Apocrypha)',
    abbreviation: 'KJVA',
    abbreviationLocal: 'KJVA',
    languageId: 'eng',
    languageName: 'English',
    languageNameLocal: 'English',
    description: 'King James Version including Deuterocanonical / Apocrypha books',
    descriptionLocal: 'King James Version including Deuterocanonical / Apocrypha books',
    copyright: 'Public Domain',
  }, false)

  writeFileSync(join(dataDir, 'en-kjva.json'), JSON.stringify(enKjva, null, 2), 'utf-8')
  console.log(`Saved en-kjva.json`)

  console.log('\nDone! Bible data files are in data/bible/')
}

main().catch((err) => {
  console.error('Error:', err)
  process.exit(1)
})
