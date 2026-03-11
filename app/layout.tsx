import type { Metadata, Viewport } from 'next'
import { NextIntlClientProvider } from 'next-intl'
import { getMessages, getLocale } from 'next-intl/server'
import { Toaster } from 'sonner'
import './globals.css'

export const metadata: Metadata = {
  title: 'Ekklesia',
  description: 'Church Management Platform',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Ekklesia',
    startupImage: '/apple-touch-icon.png',
  },
  icons: {
    apple: '/apple-touch-icon.png',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
  themeColor: '#09090b',
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const locale = await getLocale()
  const messages = await getMessages()
  const dir = locale.startsWith('ar') ? 'rtl' : 'ltr'

  return (
    <html lang={locale} dir={dir} suppressHydrationWarning>
      <body className="min-h-screen bg-background antialiased" suppressHydrationWarning>
        <NextIntlClientProvider messages={messages}>
          {children}
        </NextIntlClientProvider>
        <Toaster
          position="top-center"
          richColors
          closeButton
        />
      </body>
    </html>
  )
}
