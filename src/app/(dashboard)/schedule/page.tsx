/**
 * /schedule — Upcoming Matches
 *
 * Shows all PENDING (scheduled) matches across every tournament
 * the current user belongs to. Sorted by scheduledAt, then createdAt.
 */

import type { Metadata }       from 'next'
import Link                    from 'next/link'
import { CalendarClock, Plus } from 'lucide-react'
import { getUpcomingMatches }  from '@/actions/match'
import { ScheduleList }        from '@/components/schedule/schedule-list'

export const metadata: Metadata = { title: 'Schedule — My Backgammon Club' }
export const dynamic = 'force-dynamic'

export default async function SchedulePage() {
  const matches = await getUpcomingMatches()

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-ink">
            <CalendarClock className="h-6 w-6 text-gold" />
            Schedule
          </h1>
          <p className="mt-0.5 text-sm text-ink-muted">
            Upcoming matches across all your tournaments
          </p>
        </div>

        {/* Quick link to schedule from a tournament */}
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 rounded-lg border border-line-gold/50 bg-surface-raised px-3 py-2 text-xs font-medium text-gold hover:bg-surface-elevated transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          New match
        </Link>
      </div>

      {/* Upcoming list */}
      <ScheduleList matches={matches} />
    </div>
  )
}
