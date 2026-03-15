// PERF: Only import and init Sentry when DSN is configured.

export {}

const sentryDsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN

if (sentryDsn) {
  import('@sentry/nextjs').then((Sentry) => {
    Sentry.init({
      dsn: sentryDsn,
      environment: process.env.NODE_ENV,
      tracesSampleRate: 0.1,
      debug: false,
    })
  })
}
