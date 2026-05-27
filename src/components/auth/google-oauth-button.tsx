'use client'

import { useState }     from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button }       from '@/components/ui/button'

/** Google icon as inline SVG — no external dependency. */
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z"
        fill="#4285F4"
      />
      <path
        d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z"
        fill="#34A853"
      />
      <path
        d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z"
        fill="#FBBC05"
      />
      <path
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58Z"
        fill="#EA4335"
      />
    </svg>
  )
}

interface GoogleOAuthButtonProps {
  label?: string
}

/**
 * Initiates Google OAuth sign-in via Supabase.
 *
 * Requirements (Supabase Dashboard):
 *   Authentication → Providers → Google → Enable
 *   → add your Google Client ID + Secret
 *
 * Requirements (Google Cloud Console):
 *   Authorized redirect URI: https://<project-ref>.supabase.co/auth/v1/callback
 */
export function GoogleOAuthButton({ label = 'Continue with Google' }: GoogleOAuthButtonProps) {
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  const handleClick = async () => {
    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: { access_type: 'offline', prompt: 'consent' },
        },
      })

      if (oauthError) {
        setError(oauthError.message)
        setLoading(false)
      }
      // On success, browser is redirected — no further action needed.
    } catch (err) {
      setError('Google sign-in failed. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="secondary"
        className="w-full gap-2"
        size="lg"
        onClick={handleClick}
        isLoading={loading}
        disabled={loading}
      >
        {!loading && <GoogleIcon />}
        {label}
      </Button>

      {error && (
        <p className="text-xs text-center text-loss">{error}</p>
      )}
    </div>
  )
}
