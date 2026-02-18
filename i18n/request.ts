import { getRequestConfig } from 'next-intl/server'
import { cookies } from 'next/headers'

export default getRequestConfig(async () => {
  const cookieStore = await cookies()
  const locale = cookieStore.get('lang')?.value ?? 'en'
  const valid = ['en', 'ar'].includes(locale) ? locale : 'en'
  return {
    locale: valid,
    messages: (await import(`../messages/${valid}.json`)).default,
  }
})
