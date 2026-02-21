// ============================================================
// Bible Reader Constants
// ============================================================

export const HIGHLIGHT_COLORS = [
  { value: 'yellow' as const, class: 'bg-yellow-200', darkClass: 'bg-yellow-300/40' },
  { value: 'green' as const, class: 'bg-green-200', darkClass: 'bg-green-300/40' },
  { value: 'blue' as const, class: 'bg-blue-200', darkClass: 'bg-blue-300/40' },
  { value: 'pink' as const, class: 'bg-pink-200', darkClass: 'bg-pink-300/40' },
  { value: 'orange' as const, class: 'bg-orange-200', darkClass: 'bg-orange-300/40' },
] as const

// Popular languages for quick-filter chips in version selector
export const POPULAR_LANGUAGES = [
  { id: 'ara', label: 'العربية', labelEn: 'Arabic' },
  { id: 'eng', label: 'English', labelEn: 'English' },
  { id: 'fra', label: 'Français', labelEn: 'French' },
  { id: 'spa', label: 'Español', labelEn: 'Spanish' },
  { id: 'deu', label: 'Deutsch', labelEn: 'German' },
  { id: 'kor', label: '한국어', labelEn: 'Korean' },
  { id: 'zho', label: '中文', labelEn: 'Chinese' },
] as const

// Old Testament books (Protestant canon)
export const OT_BOOKS = [
  'GEN', 'EXO', 'LEV', 'NUM', 'DEU', 'JOS', 'JDG', 'RUT',
  '1SA', '2SA', '1KI', '2KI', '1CH', '2CH', 'EZR', 'NEH',
  'EST', 'JOB', 'PSA', 'PRO', 'ECC', 'SNG', 'ISA', 'JER',
  'LAM', 'EZK', 'DAN', 'HOS', 'JOL', 'AMO', 'OBA', 'JON',
  'MIC', 'NAM', 'HAB', 'ZEP', 'HAG', 'ZEC', 'MAL',
]

// Deuterocanonical / Apocrypha books (Catholic & Orthodox)
export const DEUTEROCANONICAL_BOOKS = [
  'TOB', 'JDT', 'ESG', 'WIS', 'SIR', 'BAR', 'LJE',
  'S3Y', 'SUS', 'BEL', '1MA', '2MA', '3MA', '4MA',
  '1ES', '2ES', 'MAN', 'PS2', 'ODA', 'PSS', 'EZA',
  '5EZ', '6EZ', 'DAG', 'PS3', '2BA', 'LBA', 'JUB',
  'ENO', '1MQ', '2MQ', '3MQ', 'REP', '4BA', 'LAO',
]

// New Testament books
export const NT_BOOKS = [
  'MAT', 'MRK', 'LUK', 'JHN', 'ACT', 'ROM', '1CO', '2CO',
  'GAL', 'EPH', 'PHP', 'COL', '1TH', '2TH', '1TI', '2TI',
  'TIT', 'PHM', 'HEB', 'JAS', '1PE', '2PE', '1JN', '2JN',
  '3JN', 'JUD', 'REV',
]

// Arabic names for Bible books (Protestant + Deuterocanonical)
export const BIBLE_BOOKS_AR: Record<string, string> = {
  // Old Testament
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

  // Deuterocanonical
  TOB: 'طوبيا', JDT: 'يهوديت', ESG: 'أستير اليونانية',
  WIS: 'حكمة سليمان', SIR: 'يشوع بن سيراخ', BAR: 'باروخ',
  LJE: 'رسالة إرميا',
  S3Y: 'تسبحة الفتية الثلاثة', SUS: 'سوسنة', BEL: 'بال والتنين',
  '1MA': 'المكابيين الأول', '2MA': 'المكابيين الثاني',
  '3MA': 'المكابيين الثالث', '4MA': 'المكابيين الرابع',
  '1ES': 'عزرا الأول', '2ES': 'عزرا الثاني',
  MAN: 'صلاة منسى', PS2: 'المزمور 151',

  // New Testament
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

// Determine which section a book belongs to
export function getBookSection(bookId: string): 'ot' | 'deuterocanonical' | 'nt' {
  if (NT_BOOKS.includes(bookId)) return 'nt'
  if (DEUTEROCANONICAL_BOOKS.includes(bookId)) return 'deuterocanonical'
  return 'ot'
}
