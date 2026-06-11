import type { Metadata } from 'next'
import Link from 'next/link'
import { ChevronLeft, ArrowRight, GraduationCap } from 'lucide-react'
import { LESSONS } from '@/lib/lessons-content'
import { cn } from '@/lib/utils'

export const metadata: Metadata = { title: 'Lessons — My Backgammon Club' }

const LEVEL_STYLES: Record<string, string> = {
  Beginner:     'bg-win/10 text-win border-win/30',
  Intermediate: 'bg-gold/10 text-gold border-gold/30',
  Advanced:     'bg-loss/10 text-loss border-loss/30',
}

export default function LessonsPage() {
  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <div>
        <Link
          href="/rules"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-muted hover:text-ink transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          Rules & Strategy
        </Link>
        <h1 className="mt-2 flex items-center gap-2 text-2xl font-bold text-ink">
          <GraduationCap className="h-6 w-6 text-gold" />
          Lessons
        </h1>
        <p className="mt-0.5 text-sm text-ink-muted">
          Step-by-step, hands-on tutorials right on the board — no account needed.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {LESSONS.map(lesson => (
          <Link
            key={lesson.slug}
            href={`/lessons/${lesson.slug}`}
            className="group flex flex-col gap-2 rounded-2xl border border-line bg-surface-raised p-5
              transition-colors hover:border-gold/40 hover:bg-surface-elevated"
          >
            <div className="flex items-center justify-between gap-2">
              <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium', LEVEL_STYLES[lesson.level])}>
                {lesson.level}
              </span>
              <ArrowRight className="h-4 w-4 shrink-0 text-ink-subtle transition-transform group-hover:translate-x-0.5 group-hover:text-gold" />
            </div>
            <h2 className="font-semibold text-ink">{lesson.title}</h2>
            <p className="text-sm text-ink-muted">{lesson.description}</p>
            <p className="text-xs text-ink-subtle">{lesson.steps.length} steps</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
