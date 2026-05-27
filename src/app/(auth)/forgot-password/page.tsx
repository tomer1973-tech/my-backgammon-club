import type { Metadata }          from 'next'
import { ForgotPasswordForm }     from '@/components/auth/forgot-password-form'

export const metadata: Metadata = { title: 'Reset Password' }

export default function ForgotPasswordPage() {
  return (
    <div className="animate-fade-in">
      <div className="mb-8 text-center">
        <div className="mb-3 inline-flex h-16 w-16 items-center justify-center rounded-2xl
          bg-surface-raised border border-line-gold/50 shadow-gold text-4xl">
          🔑
        </div>
        <h1 className="font-display text-3xl font-bold text-ink tracking-tight">
          Reset Password
        </h1>
        <p className="mt-1.5 text-sm text-ink-muted">
          Enter your email and we&apos;ll send a reset link
        </p>
      </div>

      <div className="rounded-2xl border border-line bg-surface-raised shadow-lg p-6">
        <ForgotPasswordForm />
      </div>
    </div>
  )
}
