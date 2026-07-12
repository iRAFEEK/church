import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { isFeatureEnabled } from '@/lib/features'

// Public routes that don't require authentication
const PUBLIC_PATHS = [
  '/login',
  '/signup',      // Self-service account creation
  '/forgot-password', // Request a password-reset email
  '/reset-password',  // Set a new password (recovery token exchanged client-side, no session cookie yet)
  '/select-church', // Church picker (authenticated but not in app layout)
  '/welcome',     // Church landing page
  '/join',        // QR visitor form (Phase 2)
  '/api/webhooks', // Twilio/external webhooks
  '/api/auth/sms-hook', // Supabase Send-SMS auth hook (protected by signature, not auth)
  '/api/visitors', // Public visitor submission (Phase 2)
  '/api/cron',     // Cron jobs (secured by CRON_SECRET)
  '/api/churches/register', // Public church registration
  '/api/churches/search',   // Public church directory search — /signup (logged-out) picks a church with it
  '/api/health',   // Health check for uptime monitoring (no auth)
]

function isPublicPath(pathname: string): boolean {
  if (pathname === '/') return true
  return PUBLIC_PATHS.some(path => pathname.startsWith(path))
}

export async function middleware(request: NextRequest) {
  // Expose the current path to Server Components (the (app) layout uses it to enforce the
  // pending-church allowlist). Mutating request.headers propagates through the
  // NextResponse.next({ request }) calls below.
  request.headers.set('x-pathname', request.nextUrl.pathname)

  let supabaseResponse = NextResponse.next({
    request,
  })

  // Auto-detect language on first visit (no lang cookie yet)
  if (!request.cookies.has('lang')) {
    const country = request.headers.get('x-vercel-ip-country') ?? ''
    let defaultLang = 'ar'
    if (country === 'EG') {
      defaultLang = 'ar'
    } else if (!['SA', 'AE', 'KW', 'QA', 'BH', 'OM', 'IQ', 'JO', 'LB', 'SY', 'PS', 'YE', 'LY', 'TN', 'DZ', 'MA', 'SD', 'EG'].includes(country)) {
      // Non-Arabic-speaking country — check Accept-Language
      const acceptLang = request.headers.get('accept-language') ?? ''
      if (!acceptLang.match(/\bar/i)) {
        defaultLang = 'en'
      }
    }
    request.cookies.set('lang', defaultLang)
    supabaseResponse = NextResponse.next({ request })
    supabaseResponse.cookies.set('lang', defaultLang, {
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
      sameSite: 'lax',
    })
  }

  // Capture lang value before Supabase may overwrite supabaseResponse
  const langToPreserve = request.cookies.get('lang')?.value

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setAll(cookiesToSet: { name: string; value: string; options?: any }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
          // Re-apply lang cookie if Supabase overwrote supabaseResponse
          if (langToPreserve) {
            supabaseResponse.cookies.set('lang', langToPreserve, {
              path: '/',
              maxAge: 60 * 60 * 24 * 365,
              sameSite: 'lax',
            })
          }
        },
      },
    }
  )

  // Use getSession for fast local JWT check (no network round trip).
  // Secure verification happens in getCurrentUserWithRole() on each page.
  const { data: { session } } = await supabase.auth.getSession()

  const { pathname } = request.nextUrl

  // Finance is gated behind a feature flag while the module is in development.
  // Block the entire surface (admin finance, member giving, and the finance API)
  // so nothing is reachable until the flag is enabled.
  if (
    !isFeatureEnabled('finance') &&
    (pathname.startsWith('/admin/finance') ||
      pathname.startsWith('/finance/my-giving') ||
      pathname.startsWith('/api/finance'))
  ) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    const target = request.nextUrl.clone()
    target.pathname = session ? '/dashboard' : '/login'
    return NextResponse.redirect(target)
  }

  // Event templates are gated behind a feature flag while the module is in
  // development (same treatment as finance). Block the pages that author or
  // consume templates and the templates API so nothing is reachable until the
  // flag is enabled (NEXT_PUBLIC_FEATURE_TEMPLATES=true on staging/local).
  if (
    !isFeatureEnabled('templates') &&
    (pathname.startsWith('/admin/templates') ||
      pathname.startsWith('/admin/events/from-template') ||
      pathname.startsWith('/api/templates') ||
      pathname.startsWith('/api/events/from-template'))
  ) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    const target = request.nextUrl.clone()
    target.pathname = session ? '/dashboard' : '/login'
    return NextResponse.redirect(target)
  }

  // Allow public paths without auth
  if (isPublicPath(pathname)) {
    return supabaseResponse
  }

  // Redirect to login if not authenticated
  if (!session) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    return NextResponse.redirect(loginUrl)
  }

  // If authenticated and visiting /login, redirect to home
  if (pathname === '/login') {
    const homeUrl = request.nextUrl.clone()
    homeUrl.pathname = '/dashboard'
    return NextResponse.redirect(homeUrl)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
