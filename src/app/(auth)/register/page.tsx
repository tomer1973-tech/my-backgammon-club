import type { Metadata } from 'next'
import Link              from 'next/link'
import { RegisterForm }  from '@/components/auth/register-form'

export const metadata: Metadata = { title: 'Create Account' }

export default function RegisterPage() {
  return (
    <div className="animate-fade-in">
      {/* Brand mark */}
      <div className="mb-8 text-center">
        <div className="mb-3 inline-flex h-16 w-16 items-center justify-center rounded-2xl
          bg-surface-raised border border-line-gold/50 shadow-gold text-4xl">
          🎲
        </div>
        <h1 className="font-display text-3xl font-bold text-ink tracking-tight">
          Create Account
        </h1>
        <p className="mt-1.5 text-sm text-ink-muted">
          Join your backgammon club
        </p>
      </div>

      {/* Form card */}
      <div className="rounded-2xl border border-line bg-surface-raised shadow-lg p-6">
        <RegisterForm />
      </div>

      {/* Quick game */}
      <div className="mt-4 rounded-xl border border-line-gold/30 bg-surface-raised/60 px-4 py-3
        flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-ink">Just want to play?</p>
          <p className="text-xs text-ink-subtle">Score a quick game — no account needed</p>
        </div>
        <Link
          href="/quick-game"
          className="shrink-0 rounded-lg border border-line-gold/50 bg-surface-elevated
            px-3 py-2 text-xs font-semibold text-gold hover:bg-gold/10 transition-colors"
        >
          Quick Game →
        </Link>
      </div>

      {/* Footer */}
      <p className="mt-6 text-center text-sm text-ink-subtle">
        Already have an account?{' '}
        <Link
          href="/login"
          className="text-gold hover:text-gold-bright font-medium transition-colors duration-150"
        >
          Sign in
        </Link>
      </p>
    </div>
  )
}
