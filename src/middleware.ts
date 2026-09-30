import { NextRequest, NextResponse } from 'next/server'
import { createMiddlewareClient }   from '@/lib/supabase/middleware'

/**
 * Route protection middleware.
 *
 * Public routes (no auth required):
 *   /login, /register, /forgot-password, /verify-email
 *   /auth/*  — OAuth callbacks, email confirmation, password reset links
 *
 * All other routes redirect to /login when unauthenticated.
 * Auth pages redirect to / when already authenticated.
 */

/** Hard ceiling (ms) for the outbound call to Supabase Auth from middleware. */
const AUTH_CHECK_TIMEOUT_MS = 4000

/**
 * supabase.auth.getUser() makes a network round-trip to the Supabase Auth
 * server on every request. If that server is slow, paused, or briefly
 * unreachable, an un-timed-out await here hangs the middleware — which runs
 * on nearly every route — until Vercel's hard ~25s ceiling, producing a
 * site-wide 504 MIDDLEWARE_INVOCATION_TIMEOUT instead of a normal, isolated
 * auth failure. Racing it against a short timeout converts that outage mode
 * into a fast, safe "treat as unauthenticated" fallback: unauthenticated and
 * public routes keep working immediately, and protected routes redirect to
 * /login (same as an expired session) instead of hanging the whole site.
 */
async function getUserSafe(
  supabase: ReturnType<typeof createMiddlewareClient>['supabase'],
) {
  const timeout = new Promise<{ data: { user: null }; timedOut: true }>((resolve) => {
    setTimeout(() => resolve({ data: { user: null }, timedOut: true }), AUTH_CHECK_TIMEOUT_MS)
  })

  try {
    const result = await Promise.race([
      supabase.auth.getUser().then((r) => ({ ...r, timedOut: false as const })),
      timeout,
    ])
    if (result.timedOut) {
      console.error('[middleware] supabase.auth.getUser() timed out after', AUTH_CHECK_TIMEOUT_MS, 'ms')
    }
    return result
  } catch (err) {
    console.error('[middleware] supabase.auth.getUser() error:', err)
    return { data: { user: null }, timedOut: false as const }
  }
}

export async function middleware(request: NextRequest) {
  const { supabase, response } = createMiddlewareClient(request)
  const { pathname }           = request.nextUrl

  // Supabase refreshes the session token on every middleware call.
  const { data: { user } } = await getUserSafe(supabase)
  const isAuthed = !!user

  // Auth-only pages: redirect to / when already signed in
  // (so logged-in users don't see the login/register forms)
  const isAuthPage =
    pathname === '/login'           ||
    pathname === '/register'        ||
    pathname === '/forgot-password' ||
    pathname === '/verify-email'

  if (isAuthPage && isAuthed) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // Public routes that anyone can access regardless of auth status
  const isPublicRoute =
    isAuthPage                      ||
    pathname.startsWith('/auth/')   || // /auth/callback, etc.
    pathname.startsWith('/quick-game') || // no-account quick game mode
    pathname.startsWith('/play')       || // no-account local hot-seat play
    pathname.startsWith('/practice')   || // no-account practice vs AI
    pathname.startsWith('/lessons')       // no-account interactive tutorial

  // Redirect unauthenticated users to login (preserve intended destination)
  if (!isPublicRoute && !isAuthed) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('from', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     *  - _next/static (Next.js build assets)
     *  - _next/image  (image optimisation)
     *  - favicon.ico
     *  - public static files (images, fonts…)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
