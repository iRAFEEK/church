import { PostHog } from 'posthog-node'

let client: PostHog | null = null

export function getPostHogServer(): PostHog | null {
  if (!process.env.POSTHOG_PROJECT_API_KEY) return null

  if (!client) {
    client = new PostHog(process.env.POSTHOG_PROJECT_API_KEY, {
      host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://eu.i.posthog.com',
      flushAt: 20,
      flushInterval: 10000,
    })
  }

  return client
}

export async function flushPostHog() {
  if (client) {
    await client.shutdown()
    client = null
  }
}
