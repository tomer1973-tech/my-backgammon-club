'use client'

import { useState }                        from 'react'
import { useFormState, useFormStatus }     from 'react-dom'
import { User, Mail, Lock, MailCheck, Phone } from 'lucide-react'
import { register }                        from '@/actions/auth'
import type { RegisterResult }             from '@/actions/auth'
import { Button }                          from '@/components/ui/button'
import { Input }                           from '@/components/ui/input'
import { GoogleOAuthButton }               from '@/components/auth/google-oauth-button'
import { AppleOAuthButton }                from '@/components/auth/apple-oauth-button'
import { PhoneAuthForm }                   from '@/components/auth/phone-auth-form'
import { PHONE_AUTH_ENABLED }              from '@/lib/feature-flags'

const INITIAL_STATE: RegisterResult = { success: true, data: undefined }

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" className="w-full" size="lg" isLoading={pending}>
      Create Account
    </Button>
  )
}

export function RegisterForm() {
  const [state,      formAction] = useFormState(register, INITIAL_STATE)
  const [showPhone,  setShowPhone]  = useState(false)

  // ── Email confirmation required ─────────────────────────────────────────────
  if (state.success && state.data?.requiresConfirmation) {
    return (
      <div className="flex flex-col items-center gap-4 py-4 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl
          bg-surface-raised border border-line-gold/50 shadow-gold">
          <MailCheck className="h-7 w-7 text-gold" />
        </div>
        <div>
          <h2 className="font-bold text-lg text-ink">Check your email</h2>
          <p className="mt-1 text-sm text-ink-muted">
            We sent a confirmation link to your inbox.
            Click it to activate your account and sign in.
          </p>
        </div>
        <p className="text-xs text-ink-subtle">
          Didn&apos;t get the email?&nbsp;
          Check your spam folder or&nbsp;
          <button
            type="button"
            className="text-gold underline underline-offset-2"
            onClick={() => window.location.reload()}
          >
            try again
          </button>
          .
        </p>
      </div>
    )
  }

  // ── Phone mode ──────────────────────────────────────────────────────────────
  if (PHONE_AUTH_ENABLED && showPhone) {
    return (
      <PhoneAuthForm onBack={() => setShowPhone(false)} />
    )
  }

  // ── Default registration options ────────────────────────────────────────────
  return (
    <div className="space-y-3">
      {/* Social / one-tap options */}
      <GoogleOAuthButton label="Sign up with Google" />
      <AppleOAuthButton  label="Sign up with Apple" />

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
          Sign up with Phone
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
          name="name"
          type="text"
          label="Your name"
          placeholder="Avi Cohen"
          autoComplete="name"
          autoFocus
          required
          leading={<User className="h-4 w-4" />}
        />

        <Input
          name="email"
          type="email"
          label="Email"
          placeholder="you@example.com"
          autoComplete="email"
          required
          leading={<Mail className="h-4 w-4" />}
        />

        <Input
          name="password"
          type="password"
          label="Password"
          placeholder="Min. 8 characters"
          autoComplete="new-password"
          required
          leading={<Lock className="h-4 w-4" />}
          hint="At least 8 characters"
        />

        <Input
          name="confirmPassword"
          type="password"
          label="Confirm password"
          placeholder="••••••••"
          autoComplete="new-password"
          required
          leading={<Lock className="h-4 w-4" />}
        />

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
