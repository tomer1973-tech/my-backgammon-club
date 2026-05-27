import type { Metadata } from 'next'
import Link              from 'next/link'
import { MailCheck }     from 'lucide-react'

export const metadata: Metadata = { title: 'Verify Your Email' }

export default function VerifyEmailPage() {
  return (
    <div className="animate-fade-in">
      <div className="rounded-2xl border border-line bg-surface-raised shadow-lg p-8 text-center">
        <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl
          bg-surface-raised border border-line-gold/50 shadow-gold">
          <MailCheck className="h-8 w-8 text-gold" />
        </div>

        <h1 className="font-display text-2xl font-bold text-ink">Check your email</h1>
        <p className="mt-2 text-sm text-ink-muted">
          We sent a confirmation link to your inbox.
          Click it to activate your account.
        </p>
        <p className="mt-3 text-xs text-ink-subtle">
          Didn&apos;t receive it? Check your spam folder.
        </p>

        <div className="mt-6">
          <Link
            href="/login"
            className="text-sm text-gold hover:text-gold-bright font-medium transition-colors"
          >
            Back to sign in
          </Link>
        </div>
      </div>
    </div>
  )
}
