import type { Metadata }  from 'next'
import Link               from 'next/link'
import { LoginForm }      from '@/components/auth/login-form'

export const metadata: Metadata = { title: 'Sign In' }

interface Props {
  searchParams: { from?: string; error?: string }
}

export default function LoginPage({ searchParams }: Props) {
  return (
    <div className="animate-fade-in">
      {/* Brand mark */}
      <div className="mb-8 text-center">
        <div className="mb-3 inline-flex h-16 w-16 items-center justify-center rounded-2xl
          bg-surface-raised border border-line-gold/50 shadow-gold text-4xl">
          🎲
        </div>
        <h1 className="font-display text-3xl font-bold text-ink tracking-tight">
          Backgammon Club
        </h1>
        <p className="mt-1.5 text-sm text-ink-muted">
          Sign in to your account
        </p>
      </div>

      {/* OAuth / callback error banner */}
      {searchParams.error && (
        <div className="mb-4 rounded-lg border border-loss/40 bg-loss/10 px-4 py-3 text-sm text-loss text-center">
          {decodeURIComponent(searchParams.error)}
        </div>
      )}

      {/* Form card */}
      <div className="rounded-2xl border border-line bg-surface-raised shadow-lg p-6">
        <LoginForm />
      </div>

      {/* Footer */}
      <p className="mt-6 text-center text-sm text-ink-subtle">
        Don&apos;t have an account?{' '}
        <Link
          href="/register"
          className="text-gold hover:text-gold-bright font-medium transition-colors duration-150"
        >
          Create one
        </Link>
      </p>
    </div>
  )
}
