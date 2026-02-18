import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { Toaster } from 'sonner'
import './globals.css'

export const metadata: Metadata = {
  title: 'Ekklesia',
  description: 'Church Management Platform',
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const cookieStore = await cookies()
  const lang = cookieStore.get('lang')?.value ?? 'ar'
  const dir = lang === 'ar' ? 'rtl' : 'ltr'

  return (
    <html lang={lang} dir={dir} suppressHydrationWarning>
      <body className="min-h-screen bg-background antialiased">
        {children}
        <Toaster
          position={dir === 'rtl' ? 'bottom-right' : 'bottom-right'}
          richColors
          closeButton
        />
      </body>
    </html>
  )
}
