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
