import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright e2e config for Ekklesia.
 *
 * Run against a running app:
 *   E2E_BASE_URL=http://localhost:3000 npm run test:e2e
 *
 * If E2E_BASE_URL is not set, Playwright starts `npm run dev` for you.
 * Browsers must be installed once: `npx playwright install chromium`.
 *
 * Data-dependent journeys (sign-up, giving, permissions) need a seeded test
 * Supabase project — see e2e/README.md. Those specs are test.skip() until the
 * required env vars are present, so the suite stays green out of the box.
 */
const baseURL = process.env.E2E_BASE_URL ?? 'http://localhost:3000'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  // The auto-started `npm run dev` compiles routes on demand, so several workers
  // hitting fresh routes at once can time out. Keep it serial by default; raise
  // E2E_WORKERS (ideally against a production build) for faster parallel runs.
  workers: process.env.E2E_WORKERS ? Number(process.env.E2E_WORKERS) : 1,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL,
    trace: 'on-first-retry',
    // Record a video of every test run (delivered as journey walkthroughs).
    video: process.env.E2E_VIDEO === 'off' ? 'off' : 'on',
    locale: 'ar',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    // Mobile profile — our primary target is budget phones on 3G.
    { name: 'mobile', use: { ...devices['Pixel 5'] } },
  ],
  // Auto-start the dev server only when no external URL is provided.
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: 'npm run dev',
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
})
