import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';
import withBundleAnalyzerInit from '@next/bundle-analyzer';
import withPWAInit from '@ducanh2912/next-pwa';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');
const withBundleAnalyzer = withBundleAnalyzerInit({
  enabled: process.env.ANALYZE === 'true',
});
const withPWA = withPWAInit({
  dest: 'public',
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  disable: process.env.NODE_ENV === 'development',
  // Append to (not replace) next-pwa's default runtimeCaching so the built
  // service worker also caches the app's .m4a/.aac voiceovers (the default
  // audio route only matches mp3/wav/ogg). public/sw.js is patched to match.
  extendDefaultRuntimeCaching: true,
  workboxOptions: {
    disableDevLogs: true,
    runtimeCaching: [
      {
        urlPattern: /\.(?:m4a|aac)$/i,
        handler: 'CacheFirst',
        options: {
          cacheName: 'static-audio-assets-ext',
          expiration: { maxEntries: 64, maxAgeSeconds: 24 * 60 * 60 },
          rangeRequests: true,
        },
      },
    ],
  },
});

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  // Legacy header retired (can introduce bugs in old browsers); superseded by output
  // escaping + the CSP below (modern guidance is '0').
  { key: 'X-XSS-Protection', value: '0' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'geolocation=(), microphone=(), camera=()' },
  // Force HTTPS for 2y (edge/Vercel also sets this; don't rely on it).
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  // Safe CSP directives that don't constrain the app's script/connect sources (Supabase,
  // PostHog, Firebase, Next inline bootstrap) so they can't break rendering, while still
  // blocking clickjacking, <base> injection, plugin/object XSS, and cross-origin form posts.
  // A full nonce-based script-src is a follow-up (roll out report-only first).
  { key: 'Content-Security-Policy', value: "object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'" },
];

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: ['lucide-react', 'recharts', 'framer-motion', 'date-fns'],
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        port: "",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
};

const composedConfig = withBundleAnalyzer(withPWA(withNextIntl(nextConfig)));

// PERF: Only wrap with Sentry when DSN is configured.
// The @sentry/nextjs import is conditional to avoid pulling the Sentry
// webpack plugin into builds that don't use it.
let finalConfig: NextConfig | Promise<NextConfig> = composedConfig;

if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  finalConfig = import('@sentry/nextjs').then(({ withSentryConfig }) =>
    withSentryConfig(composedConfig, {
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      silent: true,
      widenClientFileUpload: true,
      disableLogger: true,
    })
  );
}

export default finalConfig;
