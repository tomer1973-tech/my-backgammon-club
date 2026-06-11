import type { Metadata } from 'next'
import Link from 'next/link'
import { BookOpen, GraduationCap, ListChecks, ArrowRight } from 'lucide-react'
import { RulesTabs } from '@/components/rules/rules-tabs'

export const metadata: Metadata = { title: 'Rules & Strategy — My Backgammon Club' }

export default function RulesPage() {
  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-ink">
          <BookOpen className="h-6 w-6 text-gold" />
          Rules & Strategy
        </h1>
        <p className="mt-0.5 text-sm text-ink-muted">
          How to play backgammon, the doubling cube, and a glossary of terms.
        </p>
      </div>

      <RulesTabs />

      <Link
        href="/lessons"
        className="group flex items-center gap-4 rounded-2xl border border-line-gold/40 bg-surface-raised px-5 py-4
          transition-colors hover:border-gold/60 hover:bg-surface-elevated"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gold/10">
          <ListChecks className="h-5 w-5 text-gold" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-ink">Interactive lessons</p>
          <p className="text-sm text-ink-muted">Hands-on, step-by-step tutorials right on the board.</p>
        </div>
        <ArrowRight className="h-4 w-4 shrink-0 text-ink-subtle transition-transform group-hover:translate-x-0.5 group-hover:text-gold" />
      </Link>

      <Link
        href="/rules/strategy"
        className="group flex items-center gap-4 rounded-2xl border border-line-gold/40 bg-surface-raised px-5 py-4
          transition-colors hover:border-gold/60 hover:bg-surface-elevated"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gold/10">
          <GraduationCap className="h-5 w-5 text-gold" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-ink">Strategy articles</p>
          <p className="text-sm text-ink-muted">Openings, checker play, the doubling cube, and bear-off technique.</p>
        </div>
        <ArrowRight className="h-4 w-4 shrink-0 text-ink-subtle transition-transform group-hover:translate-x-0.5 group-hover:text-gold" />
      </Link>

      <Link
        href="/play"
        className="group flex items-center gap-4 rounded-2xl border border-line bg-surface-raised px-5 py-4
          transition-colors hover:border-gold/40 hover:bg-surface-elevated"
      >
        <div className="text-2xl">🎲</div>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-ink">Practice on the board</p>
          <p className="text-sm text-ink-muted">Try out what you've learned in a local two-player game.</p>
        </div>
        <ArrowRight className="h-4 w-4 shrink-0 text-ink-subtle transition-transform group-hover:translate-x-0.5 group-hover:text-gold" />
      </Link>
    </div>
  )
}
