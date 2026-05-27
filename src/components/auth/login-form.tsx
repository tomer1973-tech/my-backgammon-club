'use client'

import { useFormState, useFormStatus } from 'react-dom'
import Link                            from 'next/link'
import { Mail, Lock }                  from 'lucide-react'
import { login }                       from '@/actions/auth'
import { Button }                      from '@/components/ui/button'
import { Input }                       from '@/components/ui/input'
import { GoogleOAuthButton }           from '@/components/auth/google-oauth-button'
import type { ActionResult }           from '@/types'

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

  return (
    <div className="space-y-5">
      {/* Google OAuth */}
      <GoogleOAuthButton label="Continue with Google" />

      <div className="relative flex items-center gap-3">
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
