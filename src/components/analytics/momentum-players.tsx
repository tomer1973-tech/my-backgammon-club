import { cn }     from '@/lib/utils'
import { Flame, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import type { MomentumPlayer } from '@/lib/analytics'

interface MomentumPlayersProps {
  players: MomentumPlayer[]
}

const TREND_ICON = {
  up:     TrendingUp,
  down:   TrendingDown,
  stable: Minus,
} as const

const TREND_COLOR = {
  up:     'text-win',
  down:   'text-loss',
  stable: 'text-ink-muted',
} as const

const STREAK_RANK_GLOW = [
  'shadow-[0_0_16px_rgba(201,168,76,0.20)]',
  'shadow-[0_0_10px_rgba(201,168,76,0.10)]',
  '',
]

export function MomentumPlayersSection({ players }: MomentumPlayersProps) {
  if (players.length === 0) {
    return (
      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-ink-subtle">
          <Flame className="h-3.5 w-3.5 text-gold" />
          Hot streak
        </h2>
        <div className="rounded-xl border border-line bg-surface-raised py-8 text-center">
          <p className="text-sm text-ink-muted">No winning streaks yet</p>
        </div>
      </section>
    )
  }

  return (
    <section className="space-y-3">
      <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-ink-subtle">
        <Flame className="h-3.5 w-3.5 text-gold" />
        Hot streak
      </h2>
      <div className="grid gap-3 sm:grid-cols-3">
        {players.map((p, i) => {
          const TrendIcon = TREND_ICON[p.trend]
          return (
            <div
              key={p.memberId}
              className={cn(
                'rounded-xl border border-line bg-surface-raised p-4',
                i === 0 && 'border-gold/20',
                STREAK_RANK_GLOW[i] ?? '',
              )}
            >
              {/* Rank */}
              <div className="flex items-center justify-between">
                <span className={cn(
                  'text-xs font-semibold',
                  i === 0 ? 'text-gold' : 'text-ink-muted',
                )}>
                  #{i + 1}
                </span>
                <TrendIcon className={cn('h-3.5 w-3.5', TREND_COLOR[p.trend])} />
              </div>

              {/* Name */}
              <p className="mt-1.5 font-bold text-ink truncate">{p.name}</p>

              {/* Streak */}
              <div className="mt-2 flex items-center gap-1.5">
                <span className="text-2xl font-black text-win">{p.currentStreak}</span>
                <span className="text-xs text-ink-muted">win{p.currentStreak !== 1 ? 's' : ''} in a row</span>
              </div>

              {/* Last 5 + win rate */}
              <div className="mt-2 flex items-center justify-between text-xs text-ink-muted">
                <span>{p.recentWins}/5 recent</span>
                <span className="font-semibold text-ink">{p.winRate}% WR</span>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
