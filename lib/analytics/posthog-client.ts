'use client'

import posthog from 'posthog-js'

let initialized = false

export function initPostHog() {
  if (initialized) return
  if (typeof window === 'undefined') return
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return

  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://eu.i.posthog.com',

    // We handle pageviews manually via usePathname
    capture_pageview: false,
    capture_pageleave: true,

    // Privacy — important for church community trust
    autocapture: false,
    disable_session_recording: true,

    loaded: (ph) => {
      if (process.env.NODE_ENV === 'development') {
        ph.opt_out_capturing()
      }
    },

    sanitize_properties: (properties) => {
      const sanitized = { ...properties }
      delete sanitized.$email
      delete sanitized.email
      delete sanitized.phone
      delete sanitized.name
      delete sanitized.first_name
      delete sanitized.last_name
      return sanitized
    },
  })

  initialized = true
}

export { posthog }
