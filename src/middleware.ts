import { NextRequest, NextResponse } from 'next/server'
import { createMiddlewareClient }   from '@/lib/supabase/middleware'

/**
 * Route protection middleware.
 *
 * Rules:
 *  - /login and /register → redirect to / if already authed
 *  - All other non-static routes → redirect to /login if not authed
 *  - API routes under /api/tournaments/* also require auth
 */
export async function middleware(request: NextRequest) {
  const { supabase, response } = createMiddlewareClient(request)
  const { pathname }           = request.nextUrl

  // Supabase refreshes the session on every middleware call.
  const { data: { user } } = await supabase.auth.getUser()
  const isAuthed = !!user

  const isAuthPage = pathname === '/login' || pathname === '/register'

  // If already signed in, bounce away from auth pages
  if (isAuthPage && isAuthed) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // If not signed in and not on an auth page, redirect to login
  if (!isAuthPage && !isAuthed) {
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
     *  - _next/image (image optimisation)
     *  - favicon.ico
     *  - public files (images, fonts…)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
