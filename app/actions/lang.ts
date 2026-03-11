'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export async function setLanguage(lang: string, pathname: string) {
  const valid = ['en', 'ar', 'ar-eg'].includes(lang) ? lang : 'en'
  const cookieStore = await cookies()
  cookieStore.set('lang', valid, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
  })
  redirect(pathname)
}
