import { getRequestConfig } from 'next-intl/server'
import { cookies } from 'next/headers'

export default getRequestConfig(async () => {
  const cookieStore = await cookies()
  const raw = cookieStore.get('lang')?.value ?? 'en'
  // Normalize locale: ar-eg, ar-SA, etc. → ar (matches messages/ar.json)
  const locale = raw.startsWith('ar') ? 'ar' : raw === 'en' ? 'en' : 'en'
  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  }
})
