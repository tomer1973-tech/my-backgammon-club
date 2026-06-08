'use client'

import { useState, useTransition } from 'react'
import Link                        from 'next/link'
import { useRouter }               from 'next/navigation'
import { CalendarClock, Trophy, Play, X, Clock } from 'lucide-react'
import { startScheduledMatch, cancelScheduledMatch } from '@/actions/match'
import type { UpcomingMatch }      from '@/actions/match'
import { Button }                  from '@/components/ui/button'
import { cn }                      from '@/lib/utils'

// ── Date helpers ─────────────────────────────────────────────────────────────

function formatScheduled(date: Date | null): { label: string; isPast: boolean; isToday: boolean } {
  if (!date) return { label: 'Unscheduled', isPast: false, isToday: false }

  const now   = new Date()
  const diff  = date.getTime() - now.getTime()
  const isPast = diff < 0
  const days  = Math.abs(Math.floor(diff / 86_400_000))

  const time = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  const dateStr = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })

  const isToday = date.toDateString() === now.toDateString()
  const label   = isToday ? `Today · ${time}` : `${dateStr} · ${time}`

  return { label, isPast, isToday }
}

// ── Single match row ──────────────────────────────────────────────────────────

function ScheduleRow({ match }: { match: UpcomingMatch }) {
  const router = useRouter()
  const [starting, startTransition] = useTransition()
  const [cancelling, cancelTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const { label, isPast, isToday } = formatScheduled(
    match.scheduledAt ? new Date(match.scheduledAt) : null
  )

  async function handleStart() {
    startTransition(async () => {
      const res = await startScheduledMatch(match.id)
      if (res.success) {
        router.push(`/tournaments/${match.tournamentId}/matches/${match.id}`)
      } else {
        setError(res.error)
      }
    })
  }

  async function handleCancel() {
    if (!confirm('Cancel this scheduled match?')) return
    cancelTransition(async () => {
      const res = await cancelScheduledMatch(match.id)
      if (!res.success) setError(res.error)
    })
  }

  return (
    <div className={cn(
      'rounded-xl border bg-surface-raised px-4 py-4 flex flex-col gap-3',
      isToday ? 'border-gold/50' : isPast ? 'border-loss/30' : 'border-line',
    )}>
      {/* Time badge */}
      <div className="flex items-center justify-between gap-2">
        <div className={cn(
          'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
          isToday ? 'bg-gold/15 text-gold'
          : isPast ? 'bg-loss/10 text-loss'
          : 'bg-surface-elevated text-ink-muted',
        )}>
          <Clock className="h-3 w-3" />
          {label}
          {isPast && ' (overdue)'}
        </div>

        {/* Tournament link */}
        <Link
          href={`/tournaments/${match.tournamentId}`}
          className="text-xs text-ink-subtle hover:text-ink truncate max-w-[140px]"
        >
          <Trophy className="inline h-3 w-3 mr-1" />
          {match.tournamentName}
        </Link>
      </div>

      {/* Players */}
      <div className="flex items-center gap-3">
        <p className="text-base font-bold text-ink">
          {match.player1Name}
          <span className="mx-2 text-sm font-normal text-ink-subtle">vs</span>
          {match.player2Name}
        </p>
        <span className="ml-auto text-xs text-ink-subtle shrink-0">
          Race to {match.targetScore}
        </span>
      </div>

      {/* Error */}
      {error && (
        <p className="rounded-lg border border-loss/40 bg-loss/10 px-3 py-2 text-xs text-loss">
          {error}
        </p>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <Button
          size="sm"
          onClick={handleStart}
          isLoading={starting}
          className="gap-1.5 flex-1"
        >
          <Play className="h-4 w-4" />
          Start now
        </Button>
        <Button
          size="sm"
          variant="destructive"
          onClick={handleCancel}
          isLoading={cancelling}
          className="gap-1.5"
        >
          <X className="h-4 w-4" />
          Cancel
        </Button>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function ScheduleList({ matches }: { matches: UpcomingMatch[] }) {
  if (matches.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-line bg-surface-raised py-16 text-center">
        <CalendarClock className="h-10 w-10 text-ink-subtle/40" />
        <div>
          <p className="text-sm font-medium text-ink">No upcoming matches</p>
          <p className="mt-1 text-xs text-ink-muted">
            Go to a tournament and schedule a match for a future date.
          </p>
        </div>
      </div>
    )
  }

  // Group by date
  const today = new Date().toDateString()
  const groups: { label: string; items: UpcomingMatch[] }[] = []

  for (const m of matches) {
    const d = m.scheduledAt ? new Date(m.scheduledAt) : null
    const label = d
      ? (d.toDateString() === today ? 'Today' : d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }))
      : 'Unscheduled'

    const existing = groups.find(g => g.label === label)
    if (existing) existing.items.push(m)
    else groups.push({ label, items: [m] })
  }

  return (
    <div className="flex flex-col gap-6">
      {groups.map(group => (
        <div key={group.label}>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-subtle">
            {group.label}
          </h2>
          <div className="flex flex-col gap-3">
            {group.items.map(m => <ScheduleRow key={m.id} match={m} />)}
          </div>
        </div>
      ))}
    </div>
  )
}
