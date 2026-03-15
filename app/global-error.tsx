'use client'

import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // PERF: Only import Sentry when DSN is configured — avoids pulling
    // ~30-50KB into the client bundle when Sentry isn't in use.
    if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
      import('@sentry/nextjs').then((Sentry) => {
        Sentry.captureException(error)
      })
    }
  }, [error])

  return (
    <html>
      <body>
        <div style={{ padding: '2rem', textAlign: 'center', fontFamily: 'system-ui, sans-serif' }}>
          <h2 style={{ marginBottom: '0.5rem' }}>Something went wrong</h2>
          <p style={{ color: '#666', fontSize: '0.95rem' }} dir="rtl">حدث خطأ غير متوقع</p>
          <button
            onClick={() => reset()}
            style={{
              marginTop: '1.5rem',
              padding: '0.5rem 1.5rem',
              borderRadius: '0.375rem',
              border: '1px solid #d1d5db',
              cursor: 'pointer',
              background: '#fff',
            }}
          >
            Try again / حاول مرة أخرى
          </button>
        </div>
      </body>
    </html>
  )
}
