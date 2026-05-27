import { NextResponse }   from 'next/server'
import { createClient }   from '@/lib/supabase/server'
import { db }             from '@/lib/db'

/**
 * Auth callback route.
 *
 * Handles three cases:
 *  1. Email confirmation  — user clicks the link in their confirmation email
 *  2. Password reset      — user clicks the link in their reset email
 *  3. OAuth (Google etc.) — provider redirects back here after login
 *
 * The `code` query param contains a PKCE authorization code.
 * Exchange it for a Supabase session, then redirect to the intended destination.
 *
 * `next` param lets the caller specify the post-auth redirect (e.g. /reset-password).
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code  = searchParams.get('code')
  const next  = searchParams.get('next') ?? '/'
  const error = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')

  // OAuth provider returned an error (e.g. user cancelled)
  if (error) {
    console.error('[auth/callback] provider error:', error, errorDescription)
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(errorDescription ?? error)}`,
    )
  }

  if (!code) {
    console.error('[auth/callback] no code param')
    return NextResponse.redirect(`${origin}/login?error=missing-code`)
  }

  const supabase = createClient()

  const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

  if (exchangeError) {
    console.error('[auth/callback] exchangeCodeForSession error:', exchangeError.message)
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(exchangeError.message)}`,
    )
  }

  const user = data.user

  if (user) {
    // Ensure a Player profile exists — covers:
    //   • Google OAuth first-time sign-in
    //   • Email confirmation when the DB write during register failed
    try {
      // Apple "Hide My Email" returns a relay address — email is always set
      // for OAuth providers but may be absent for phone-auth users.
      const email = user.email ?? `${user.id}@phone.user`

      await db.player.upsert({
        where:  { supabaseUid: user.id },
        update: { email },  // keep email in sync
        create: {
          supabaseUid: user.id,
          email,
          name:
            user.user_metadata?.full_name ??
            user.user_metadata?.name ??
            user.email?.split('@')[0] ??
            'Player',
          role: 'PLAYER',
        },
      })
    } catch (dbErr) {
      console.error('[auth/callback] player upsert error:', dbErr)
      // Non-fatal — the user is authenticated; let them in anyway.
    }
  }

  // Redirect to the intended destination (default: dashboard)
  return NextResponse.redirect(`${origin}${next}`)
}
