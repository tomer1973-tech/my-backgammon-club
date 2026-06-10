'use client'

import { useState }                        from 'react'
import { useFormState, useFormStatus }     from 'react-dom'
import Link                                from 'next/link'
import { Mail, Lock, Phone }               from 'lucide-react'
import { login }                           from '@/actions/auth'
import { Button }                          from '@/components/ui/button'
import { Input }                           from '@/components/ui/input'
import { GoogleOAuthButton }               from '@/components/auth/google-oauth-button'
import { AppleOAuthButton }                from '@/components/auth/apple-oauth-button'
import { PhoneAuthForm }                   from '@/components/auth/phone-auth-form'
import { PHONE_AUTH_ENABLED }              from '@/lib/feature-flags'
import type { ActionResult }               from '@/types'

const INITIAL_STATE: ActionResult = { success: true, data: undefined }

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" className="w-full" size="lg" isLoading={pending}>
      Sign In
    </Button>
  )
}

export function LoginForm() {
  const [state, formAction] = useFormState(login, INITIAL_STATE)
  const [showPhone, setShowPhone] = useState(false)

  // ── Phone mode ──────────────────────────────────────────────────────────────
  if (PHONE_AUTH_ENABLED && showPhone) {
    return (
      <PhoneAuthForm onBack={() => setShowPhone(false)} />
    )
  }

  // ── Default sign-in options ─────────────────────────────────────────────────
  return (
    <div className="space-y-3">
      {/* Social / one-tap options */}
      <GoogleOAuthButton label="Continue with Google" />
      <AppleOAuthButton  label="Continue with Apple" />

      {/* Phone button — hidden until SMS provider is configured for production use */}
      {PHONE_AUTH_ENABLED && (
        <Button
          type="button"
          variant="secondary"
          className="w-full gap-2"
          size="lg"
          onClick={() => setShowPhone(true)}
        >
          <Phone className="h-4 w-4" />
          Continue with Phone
        </Button>
      )}

      <div className="relative flex items-center gap-3 py-1">
        <div className="flex-1 border-t border-line" />
        <span className="text-xs text-ink-subtle">or with email</span>
        <div className="flex-1 border-t border-line" />
      </div>

      {/* Email / password form */}
      <form action={formAction} className="space-y-4">
        <Input
          name="email"
          type="email"
          label="Email"
          placeholder="you@example.com"
          autoComplete="email"
          autoFocus
          required
          leading={<Mail className="h-4 w-4" />}
        />

        <div className="space-y-1">
          <Input
            name="password"
            type="password"
            label="Password"
            placeholder="••••••••"
            autoComplete="current-password"
            required
            leading={<Lock className="h-4 w-4" />}
          />
          <div className="flex justify-end">
            <Link
              href="/forgot-password"
              className="text-xs text-ink-muted hover:text-gold transition-colors"
            >
              Forgot your password?
            </Link>
          </div>
        </div>

        {/* Server-side error */}
        {!state.success && (
          <div className="rounded-lg border border-loss/40 bg-loss/10 px-4 py-3 text-sm text-loss">
            {state.error}
          </div>
        )}

        <SubmitButton />
      </form>
    </div>
  )
}
