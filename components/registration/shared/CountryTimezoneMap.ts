export interface Country {
  code: string
  name: string
  nameAr: string
  timezone: string
  flag: string
}

export const MIDDLE_EAST_COUNTRIES: Country[] = [
  { code: 'LB', name: 'Lebanon', nameAr: 'لبنان', timezone: 'Asia/Beirut', flag: '🇱🇧' },
  { code: 'JO', name: 'Jordan', nameAr: 'الأردن', timezone: 'Asia/Amman', flag: '🇯🇴' },
  { code: 'EG', name: 'Egypt', nameAr: 'مصر', timezone: 'Africa/Cairo', flag: '🇪🇬' },
  { code: 'IQ', name: 'Iraq', nameAr: 'العراق', timezone: 'Asia/Baghdad', flag: '🇮🇶' },
  { code: 'SY', name: 'Syria', nameAr: 'سوريا', timezone: 'Asia/Damascus', flag: '🇸🇾' },
  { code: 'PS', name: 'Palestine', nameAr: 'فلسطين', timezone: 'Asia/Hebron', flag: '🇵🇸' },
  { code: 'KW', name: 'Kuwait', nameAr: 'الكويت', timezone: 'Asia/Kuwait', flag: '🇰🇼' },
  { code: 'AE', name: 'UAE', nameAr: 'الإمارات', timezone: 'Asia/Dubai', flag: '🇦🇪' },
  { code: 'SA', name: 'Saudi Arabia', nameAr: 'السعودية', timezone: 'Asia/Riyadh', flag: '🇸🇦' },
  { code: 'BH', name: 'Bahrain', nameAr: 'البحرين', timezone: 'Asia/Bahrain', flag: '🇧🇭' },
  { code: 'QA', name: 'Qatar', nameAr: 'قطر', timezone: 'Asia/Qatar', flag: '🇶🇦' },
  { code: 'OM', name: 'Oman', nameAr: 'عُمان', timezone: 'Asia/Muscat', flag: '🇴🇲' },
]

export interface Denomination {
  id: string
  name: string
  nameAr: string
}

export const DENOMINATIONS: Denomination[] = [
  { id: 'evangelical', name: 'Evangelical', nameAr: 'إنجيلية' },
  { id: 'baptist', name: 'Baptist', nameAr: 'معمدانية' },
  { id: 'pentecostal', name: 'Pentecostal', nameAr: 'خمسينية' },
  { id: 'orthodox', name: 'Orthodox', nameAr: 'أرثوذكسية' },
  { id: 'catholic', name: 'Catholic', nameAr: 'كاثوليكية' },
  { id: 'maronite', name: 'Maronite', nameAr: 'مارونية' },
  { id: 'presbyterian', name: 'Presbyterian', nameAr: 'مشيخية' },
  { id: 'methodist', name: 'Methodist', nameAr: 'ميثودية' },
  { id: 'lutheran', name: 'Lutheran', nameAr: 'لوثرية' },
  { id: 'anglican', name: 'Anglican', nameAr: 'أنجليكانية' },
  { id: 'nazarene', name: 'Church of the Nazarene', nameAr: 'كنيسة الناصري' },
  { id: 'alliance', name: 'Christian & Missionary Alliance', nameAr: 'التحالف المسيحي والتبشيري' },
  { id: 'brethren', name: 'Brethren', nameAr: 'الإخوة' },
  { id: 'nondenominational', name: 'Non-denominational', nameAr: 'غير طائفية' },
  { id: 'other', name: 'Other', nameAr: 'أخرى' },
]

export interface BibleTranslation {
  id: string
  name: string
  nameAr: string
  language: 'ar' | 'en'
  books: number
}

export const BIBLE_TRANSLATIONS: BibleTranslation[] = [
  { id: 'ar-svd', name: 'Smith & Van Dyke', nameAr: 'سميث وفاندايك', language: 'ar', books: 66 },
  { id: 'ar-svd-dc', name: 'Smith & Van Dyke (with Deuterocanonical)', nameAr: 'سميث وفاندايك (مع الأسفار القانونية الثانية)', language: 'ar', books: 80 },
  { id: 'ar-nav', name: 'New Arabic Version', nameAr: 'كتاب الحياة', language: 'ar', books: 66 },
  { id: 'en-kjva', name: 'King James Version', nameAr: 'كينغ جيمس', language: 'en', books: 80 },
]
