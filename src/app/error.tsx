'use client'

/**
 * Root error boundary — catches uncaught exceptions from any page or layout
 * that doesn't have a more specific error.tsx, and shows a recoverable
 * screen instead of Next.js's bare "Application error" crash page.
 */

import { useEffect } from 'react'
import Link from 'next/link'
import { AlertTriangle, RotateCcw, Home } from 'lucide-react'

// Uses the design-token classes (bg-surface-canvas, text-gold, etc.) rather
// than component state. This can render before the theme bootstrap script
// in the root layout has set data-theme on <html> — but the bare :root
// block in globals.css now resolves to the same light palette by default,
// so these tokens are safe here without waiting on that script, and they
// still correctly switch to dark if data-theme="dark" is already set.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('Unhandled app error:', error)
  }, [error])

  return (
    <div className="flex min-h-dvh items-center justify-center bg-surface-canvas px-4 py-10">
      <div className="w-full max-w-sm rounded-2xl border border-line bg-surface-raised p-6 text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gold/15 text-gold">
          <AlertTriangle className="h-6 w-6" />
        </span>
        <h1 className="mt-4 text-lg font-bold text-ink">Something went wrong</h1>
        <p className="mt-1.5 text-sm text-ink-muted">
          That didn't load right. Give it another try — your progress is saved.
        </p>
        {error.digest && (
          <p className="mt-2 text-[10px] text-ink-subtle">Reference: {error.digest}</p>
        )}
        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <button
            onClick={reset}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gold px-4 py-2.5 text-sm font-semibold text-surface-canvas transition-opacity hover:opacity-90"
          >
            <RotateCcw className="h-4 w-4" />
            Try again
          </button>
          <Link
            href="/"
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-line px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-surface-elevated"
          >
            <Home className="h-4 w-4" />
            Go home
          </Link>
        </div>
      </div>
    </div>
  )
}
