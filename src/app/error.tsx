'use client'

/**
 * Root error boundary — catches uncaught exceptions from any page or layout
 * that doesn't have a more specific error.tsx, and shows a recoverable
 * screen instead of Next.js's bare "Application error" crash page.
 */

import { useEffect } from 'react'
import Link from 'next/link'
import { AlertTriangle, RotateCcw, Home } from 'lucide-react'

// Hardcoded colors (not CSS vars) — this can render before the theme
// bootstrap script has run, so it can't depend on --gold/--surface-* etc.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('Unhandled app error:', error)
  }, [error])

  return (
    <div className="flex min-h-dvh items-center justify-center bg-[#14171f] px-4 py-10">
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#1a1e27] p-6 text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#e08a35]/15 text-[#e08a35]">
          <AlertTriangle className="h-6 w-6" />
        </span>
        <h1 className="mt-4 text-lg font-bold text-[#eef1f5]">Something went wrong</h1>
        <p className="mt-1.5 text-sm text-[#8893a3]">
          That didn't load right. Give it another try — your progress is saved.
        </p>
        {error.digest && (
          <p className="mt-2 text-[10px] text-[#5b6573]">Reference: {error.digest}</p>
        )}
        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <button
            onClick={reset}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#e08a35] px-4 py-2.5 text-sm font-semibold text-[#14171f] transition-opacity hover:opacity-90"
          >
            <RotateCcw className="h-4 w-4" />
            Try again
          </button>
          <Link
            href="/"
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/15 px-4 py-2.5 text-sm font-medium text-[#eef1f5] transition-colors hover:bg-white/5"
          >
            <Home className="h-4 w-4" />
            Go home
          </Link>
        </div>
      </div>
    </div>
  )
}
