/**
 * MatchCard — compact match row for the history list.
 */

import Link                        from 'next/link'
import { Calendar, Clock, Trophy } from 'lucide-react'
import { Badge }                   from '@/components/ui/badge'
import { OPENING_TYPE_LABEL }      from '@/types'
import { cn }                      from '@/lib/utils'
import type { MatchSummary }       from '@/types'

interface MatchCardProps {
  match: MatchSummary
}

const statusVariant = {
  PENDING:   'warning',
  ACTIVE:    'win',
  COMPLETED: 'default',
} as const

export function MatchCard({ match }: MatchCardProps) {
  const isActive    = match.status === 'ACTIVE'
  const isCompleted = match.status === 'COMPLETED'

  const formattedDate = new Date(match.createdAt).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric',
  })
  const formattedTime = new Date(match.createdAt).toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit',
  })

  const durationMin = match.duration ? Math.round(match.duration / 60) : null

  return (
    <Link href={`/tournaments/${match.tournamentId}/matches/${match.id}`}>
      <div className={cn(
        'rounded-xl border bg-surface-raised p-4 transition-all',
        'hover:border-gold/40 hover:shadow-sm',
        isActive ? 'border-win/40' : 'border-line',
      )}>
        <div className="flex items-start justify-between gap-3">
          {/* Players vs */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={cn(
                'text-sm font-semibold',
                isCompleted && match.winnerName === match.player1Name
                  ? 'text-win' : 'text-ink',
              )}>
                {match.player1Name}
              </span>
              <span className="text-xs text-ink-subtle">vs</span>
              <span className={cn(
                'text-sm font-semibold',
                isCompleted && match.winnerName === match.player2Name
                  ? 'text-win' : 'text-ink',
              )}>
                {match.player2Name}
              </span>
            </div>

            {/* Score */}
            {(isActive || isCompleted) && (
              <p className="mt-1 text-lg font-black font-mono tracking-tight text-gold">
                {match.player1Score} – {match.player2Score}
                <span className="ml-2 text-xs font-normal text-ink-subtle">
                  Race to {match.targetScore}
                </span>
              </p>
            )}

            {/* Winner */}
            {isCompleted && match.winnerName && (
              <div className="mt-1 flex items-center gap-1">
                <Trophy className="h-3 w-3 text-win" />
                <span className="text-xs font-medium text-win">{match.winnerName} wins</span>
              </div>
            )}

            {/* Opening type */}
            {match.openingType && (
              <p className="mt-1 text-xs text-ink-subtle">
                {OPENING_TYPE_LABEL[match.openingType]}
              </p>
            )}
          </div>

          {/* Right meta */}
          <div className="flex flex-col items-end gap-2 shrink-0">
            <Badge variant={statusVariant[match.status]}>
              {match.status === 'ACTIVE' ? (
                <span className="flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-win animate-pulse" />
                  Live
                </span>
              ) : match.status}
            </Badge>

            <div className="flex items-center gap-1 text-xs text-ink-subtle">
              <Calendar className="h-3 w-3" />
              {formattedDate} · {formattedTime}
            </div>

            {durationMin && (
              <div className="flex items-center gap-1 text-xs text-ink-subtle">
                <Clock className="h-3 w-3" />
                {durationMin}m
              </div>
            )}

            {match.gameCount > 0 && (
              <span className="text-xs text-ink-subtle">
                {match.gameCount} {match.gameCount === 1 ? 'game' : 'games'}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  )
}
