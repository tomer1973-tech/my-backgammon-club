'use client'

import { useState }     from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button }       from '@/components/ui/button'

/** Apple logo as inline SVG — matches Apple's official brand mark. */
function AppleIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 814 1000"
      aria-hidden="true"
      fill="currentColor"
    >
      <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164.3-39.5c-76.5 0-103.7 40.8-165.9 40.8s-105-57.9-155.5-127.4C46 790.7 0 663 0 541.8c0-194.3 127.4-297.5 252.8-297.5 66.1 0 121.2 43.4 162.7 43.4 39.5 0 101.1-46 176.3-46 28.5 0 130.9 2.6 198.3 99.2zm-234-181.5c31.1-36.9 53.1-88.1 53.1-139.3 0-7.1-.6-14.3-1.9-20.1-50.6 1.9-110.8 33.7-147.1 75.8-28.5 32.4-55.1 83.6-55.1 135.5 0 7.8 1.3 15.6 1.9 18.1 3.2.6 8.4 1.3 13.6 1.3 45.4 0 102.5-30.4 135.5-71.3z" />
    </svg>
  )
}

interface AppleOAuthButtonProps {
  label?: string
}

/**
 * Initiates Apple Sign-In via Supabase OAuth.
 *
 * Requirements (Supabase Dashboard):
 *   Authentication → Providers → Apple → Enable
 *   → add your Apple Team ID, Key ID, and private key
 *
 * Requirements (Apple Developer Console):
 *   App ID with Sign In with Apple capability
 *   Services ID configured with the Supabase callback URL
 *   Authorized redirect URI: https://<project-ref>.supabase.co/auth/v1/callback
 */
export function AppleOAuthButton({ label = 'Continue with Apple' }: AppleOAuthButtonProps) {
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  const handleClick = async () => {
    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'apple',
        options:  {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (oauthError) {
        setError(oauthError.message)
        setLoading(false)
      }
      // On success the browser is redirected — no further action needed.
    } catch {
      setError('Apple sign-in failed. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="secondary"
        className="w-full gap-2 bg-[#000] border-[#000] text-white hover:bg-[#1a1a1a] hover:border-[#1a1a1a]"
        size="lg"
        onClick={handleClick}
        isLoading={loading}
        disabled={loading}
      >
        {!loading && <AppleIcon />}
        {label}
      </Button>

      {error && (
        <p className="text-xs text-center text-loss">{error}</p>
      )}
    </div>
  )
}
