/**
 * StandingsTable — tournament leaderboard.
 *
 * Sorted by: points DESC → wins DESC → match differential DESC.
 * Tiebreaker is win rate.
 */

import { Trophy, Medal }   from 'lucide-react'
import { Avatar }          from '@/components/ui/avatar'
import { Badge }           from '@/components/ui/badge'
import { Progress }        from '@/components/ui/progress'
import { cn }              from '@/lib/utils'
import type { StandingsRow } from '@/types'

interface StandingsTableProps {
  standings: StandingsRow[]
}

const rankIcon = (rank: number) => {
  if (rank === 1) return <Trophy className="h-4 w-4 text-gold" />
  if (rank === 2) return <Medal  className="h-4 w-4 text-ink-muted" />
  if (rank === 3) return <Medal  className="h-4 w-4 text-[#cd7f32]" />
  return <span className="text-xs font-mono font-bold text-ink-subtle">{rank}</span>
}

export function StandingsTable({ standings }: StandingsTableProps) {
  if (standings.length === 0) {
    return (
      <div className="rounded-xl border border-line bg-surface-raised py-12 text-center">
        <p className="text-sm text-ink-muted">No players yet.</p>
      </div>
    )
  }

  const maxPoints = Math.max(...standings.map(s => s.points), 1)

  return (
    <div className="rounded-xl border border-line bg-surface-raised overflow-hidden">
      {/* Header */}
      <div className="grid grid-cols-[2rem_1fr_4rem_4rem_5rem] gap-2 border-b border-line px-4 py-3 text-xs font-semibold uppercase tracking-wider text-ink-subtle">
        <span>#</span>
        <span>Player</span>
        <span className="text-center">W – L</span>
        <span className="text-right">Pts</span>
        <span className="text-right hidden sm:block">Win %</span>
      </div>

      {/* Rows */}
      <div className="divide-y divide-line/40">
        {standings.map(row => (
          <StandingsRow key={row.memberId} row={row} maxPoints={maxPoints} />
        ))}
      </div>
    </div>
  )
}

function StandingsRow({ row, maxPoints }: { row: StandingsRow; maxPoints: number }) {
  const isTop3 = row.rank <= 3

  return (
    <div className={cn(
      'grid grid-cols-[2rem_1fr_4rem_4rem_5rem] items-center gap-2 px-4 py-3 transition-colors',
      'hover:bg-surface-elevated',
      row.rank === 1 && 'bg-gold/5',
    )}>
      {/* Rank */}
      <div className="flex items-center justify-center">
        {rankIcon(row.rank)}
      </div>

      {/* Player */}
      <div className="flex items-center gap-2.5 min-w-0">
        <Avatar name={row.name} size="sm" />
        <div className="min-w-0">
          <p className={cn(
            'truncate text-sm font-medium',
            isTop3 ? 'text-ink' : 'text-ink-muted',
          )}>
            {row.name}
          </p>
          {row.isGuest && (
            <Badge variant="guest" className="text-[10px] py-0">Guest</Badge>
          )}
        </div>
      </div>

      {/* W – L */}
      <div className="text-center">
        <span className="text-sm font-semibold">
          <span className="text-win">{row.wins}</span>
          <span className="text-ink-subtle mx-0.5">–</span>
          <span className="text-loss">{row.losses}</span>
        </span>
      </div>

      {/* Points with mini bar */}
      <div className="flex flex-col items-end gap-1">
        <span className={cn(
          'text-sm font-black tabular-nums',
          row.rank === 1 ? 'text-gold' : 'text-ink',
        )}>
          {row.points}
        </span>
        <Progress
          value={row.points}
          max={maxPoints}
          size="sm"
          variant={row.rank === 1 ? 'gold' : 'default'}
          className="w-12"
        />
      </div>

      {/* Win rate */}
      <div className="hidden text-right sm:block">
        <span className="text-sm text-ink-muted">
          {row.totalGames > 0 ? `${row.winRate}%` : '—'}
        </span>
      </div>
    </div>
  )
}
