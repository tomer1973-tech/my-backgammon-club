import type { Metadata }      from 'next'
import { ResetPasswordForm }  from '@/components/auth/reset-password-form'

export const metadata: Metadata = { title: 'Set New Password' }

/**
 * Reached after clicking a password-reset email link.
 * The auth/callback route exchanges the code and sets a recovery session
 * before redirecting here, so the user is already authenticated.
 */
export default function ResetPasswordPage() {
  return (
    <div className="animate-fade-in">
      <div className="mb-8 text-center">
        <div className="mb-3 inline-flex h-16 w-16 items-center justify-center rounded-2xl
          bg-surface-raised border border-line-gold/50 shadow-gold text-4xl">
          🔒
        </div>
        <h1 className="font-display text-3xl font-bold text-ink tracking-tight">
          Set New Password
        </h1>
        <p className="mt-1.5 text-sm text-ink-muted">
          Choose a strong password for your account
        </p>
      </div>

      <div className="rounded-2xl border border-line bg-surface-raised shadow-lg p-6">
        <ResetPasswordForm />
      </div>
    </div>
  )
}
