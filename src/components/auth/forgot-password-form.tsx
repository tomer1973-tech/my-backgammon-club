'use client'

import { useFormState, useFormStatus } from 'react-dom'
import Link                            from 'next/link'
import { Mail, MailCheck, ArrowLeft }  from 'lucide-react'
import { forgotPassword }              from '@/actions/auth'
import { Button }                      from '@/components/ui/button'
import { Input }                       from '@/components/ui/input'
import type { ActionResult }           from '@/types'

const INITIAL_STATE: ActionResult = { success: true, data: undefined }

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" className="w-full" size="lg" isLoading={pending}>
      Send Reset Link
    </Button>
  )
}

export function ForgotPasswordForm() {
  const [state, formAction] = useFormState(forgotPassword, INITIAL_STATE)

  // Success — show confirmation
  if (state.success && state.data !== undefined) {
    return (
      <div className="flex flex-col items-center gap-4 py-4 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl
          bg-surface-raised border border-line-gold/50 shadow-gold">
          <MailCheck className="h-7 w-7 text-gold" />
        </div>
        <div>
          <h2 className="font-bold text-lg text-ink">Check your email</h2>
          <p className="mt-1 text-sm text-ink-muted">
            If an account exists with that address, we&apos;ve sent a password
            reset link. It expires in 1 hour.
          </p>
        </div>
        <Link
          href="/login"
          className="inline-flex items-center gap-1 text-sm text-gold hover:text-gold-bright transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to sign in
        </Link>
      </div>
    )
  }

  return (
    <form action={formAction} className="space-y-4">
      <Input
        name="email"
        type="email"
        label="Email address"
        placeholder="you@example.com"
        autoComplete="email"
        autoFocus
        required
        leading={<Mail className="h-4 w-4" />}
      />

      {!state.success && (
        <div className="rounded-lg border border-loss/40 bg-loss/10 px-4 py-3 text-sm text-loss">
          {state.error}
        </div>
      )}

      <SubmitButton />

      <div className="text-center">
        <Link
          href="/login"
          className="inline-flex items-center gap-1 text-sm text-ink-muted hover:text-gold transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to sign in
        </Link>
      </div>
    </form>
  )
}
