export function register() {
  // No-op for initialization
}

export const onRequestError = async (
  err: Error,
  request: { headers: { cookie?: string | string[] } },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _context: any
) => {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { getPostHogServer } = await import('./lib/analytics/posthog-server')
    const posthog = getPostHogServer()
    if (!posthog) return

    let distinctId: string | undefined
    if (request.headers.cookie) {
      const cookieString = Array.isArray(request.headers.cookie)
        ? request.headers.cookie.join('; ')
        : request.headers.cookie
      const match = cookieString.match(/ph_phc_.*?_posthog=([^;]+)/)
      if (match?.[1]) {
        try {
          const data = JSON.parse(decodeURIComponent(match[1]))
          distinctId = data.distinct_id
        } catch {
          // ignore cookie parse errors
        }
      }
    }

    await posthog.captureException(err, distinctId)
  }
}
