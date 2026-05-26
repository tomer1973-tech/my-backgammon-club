import { createServerClient } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'

type CookieToSet = { name: string; value: string; options?: Record<string, unknown> }

/**
 * Creates a Supabase client that can read AND write cookies in middleware.
 * Must be called on every request so the JWT refresh token is rotated properly.
 * Returns both the client and the response object (with updated Set-Cookie headers).
 */
export function createMiddlewareClient(request: NextRequest) {
  // Start with a passthrough response; we'll mutate its cookies below.
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: CookieToSet[]) {
          // Write to both the request (for downstream middleware) and the
          // response (so the browser receives the updated auth cookie).
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          )
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  return { supabase, response }
}
