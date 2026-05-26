import { createServerClient } from '@supabase/ssr'
import { cookies }            from 'next/headers'

type CookieToSet = { name: string; value: string; options?: Record<string, unknown> }

/**
 * Creates a Supabase client scoped to the current request's cookies.
 * Use in: Server Components, Server Actions, Route Handlers.
 *
 * The setAll try/catch is intentional — Server Components have a read-only
 * cookie store. Only Server Actions and Route Handlers can write cookies.
 */
export function createClient() {
  const cookieStore = cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: CookieToSet[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            )
          } catch {
            // Read-only context (Server Component) — safe to ignore.
            // The middleware will handle token refresh.
          }
        },
      },
    },
  )
}
