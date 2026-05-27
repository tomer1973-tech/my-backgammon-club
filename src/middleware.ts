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
export async function middleware(request: NextRequest) {
  const { supabase, response } = createMiddlewareClient(request)
  const { pathname }           = request.nextUrl

  // Supabase refreshes the session token on every middleware call.
  const { data: { user } } = await supabase.auth.getUser()
  const isAuthed = !!user

  // Routes that are public (no login required)
  const isPublicRoute =
    pathname === '/login'            ||
    pathname === '/register'         ||
    pathname === '/forgot-password'  ||
    pathname === '/verify-email'     ||
    pathname.startsWith('/auth/')    // /auth/callback, etc.

  // Redirect authenticated users away from auth pages
  if (isPublicRoute && isAuthed && !pathname.startsWith('/auth/')) {
    return NextResponse.redirect(new URL('/', request.url))
  }

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
