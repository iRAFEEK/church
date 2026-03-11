// ARCH: Centralized API route wrapper. All API routes should use this to guarantee
// consistent auth, error handling, timing, and response formatting.
// This eliminates ~15 lines of boilerplate per route and prevents auth gaps.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { resolvePermissions, HARDCODED_ROLE_DEFAULTS } from '@/lib/permissions'
import type { PermissionKey, UserRole, PermissionMap } from '@/types'

export type ApiContext = {
  req: NextRequest
  supabase: Awaited<ReturnType<typeof createClient>>
  user: { id: string; email: string }
  profile: { id: string; church_id: string; role: UserRole; permissions: PermissionMap | null }
  resolvedPermissions: Record<PermissionKey, boolean>
  params?: Record<string, string>
}

type ApiHandler = (ctx: ApiContext) => Promise<NextResponse | Response | object>

type HandlerOptions = {
  requireAuth?: boolean
  requireRoles?: UserRole[]
  requirePermissions?: PermissionKey[]
  cache?: string
}

// ARCH: Return type uses `any` for the second parameter to satisfy Next.js 15's strict
// route type checking. Next.js generates `.next/types/` files that validate handler signatures
// differently for static vs dynamic routes. Using `any` here avoids the ParamCheck mismatch.
export function apiHandler(handler: ApiHandler, options: HandlerOptions = {}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return async (req: NextRequest, routeContext?: any) => {
    const start = performance.now()
    const routeName = new URL(req.url).pathname

    try {
      const supabase = await createClient()
      const { requireAuth = true, requireRoles, requirePermissions } = options

      let user: ApiContext['user'] | null = null
      let profile: ApiContext['profile'] | null = null
      let resolvedPermissions: Record<PermissionKey, boolean> = { ...HARDCODED_ROLE_DEFAULTS.member }

      if (requireAuth) {
        const { data: { user: u }, error } = await supabase.auth.getUser()
        if (error || !u) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }
        user = { id: u.id, email: u.email! }

        const { data: p } = await supabase
          .from('profiles')
          .select('id, church_id, role, permissions')
          .eq('id', u.id)
          .single()

        if (!p) return NextResponse.json({ error: 'Profile not found' }, { status: 403 })
        profile = p as ApiContext['profile']

        // Resolve permissions
        const { data: roleDefaults } = await supabase
          .from('role_permission_defaults')
          .select('permissions')
          .eq('church_id', profile.church_id)
          .eq('role', profile.role)
          .single()

        resolvedPermissions = resolvePermissions(
          profile.role,
          (roleDefaults?.permissions ?? null) as PermissionMap | null,
          profile.permissions
        )
      }

      // Role check
      if (requireRoles && profile && !requireRoles.includes(profile.role)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }

      // Permission check
      if (requirePermissions && requirePermissions.length > 0) {
        const hasAll = requirePermissions.every(p => resolvedPermissions[p])
        if (!hasAll) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }
      }

      // Resolve params
      const params = routeContext?.params ? await routeContext.params : undefined

      // Execute handler
      const result = await handler({
        req,
        supabase,
        user: user!,
        profile: profile!,
        resolvedPermissions,
        params,
      })

      // If handler returned a plain object, wrap it in NextResponse.json
      if (!(result instanceof Response)) {
        const res = NextResponse.json(result)
        const duration = Math.round(performance.now() - start)
        res.headers.set('Server-Timing', `handler;dur=${duration};desc="${routeName}"`)
        if (options.cache) res.headers.set('Cache-Control', options.cache)
        return res
      }

      return result

    } catch (err) {
      const duration = Math.round(performance.now() - start)
      console.error(`[API ERROR] ${req.method} ${routeName} ${duration}ms`, err)

      if (err instanceof ValidationError) {
        return NextResponse.json(
          { error: err.message, fields: err.fields },
          { status: 422 }
        )
      }

      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  }
}

// ARCH: Custom error class for validation failures. Throw this from any handler
// to return a 422 with field-level error details.
export class ValidationError extends Error {
  fields?: Record<string, string>
  constructor(message: string, fields?: Record<string, string>) {
    super(message)
    this.name = 'ValidationError'
    this.fields = fields
  }
}
