'use client'

/**
 * VersusIntro — full-screen splash shown for a beat before a live match
 * begins. Two players face off, a shared stake is named, and a short
 * strategy tip fills the pause while the board sets up.
 *
 * Design intent: the app's existing gold/jade dual-accent carries the
 * "counterpoint" idea already used elsewhere in the brand — two forces
 * (players) advancing toward the same resolution (the match) from opposite
 * sides. Nothing here is invented data: rating and win count come straight
 * off the Player row, and the stake line is the tournament's own
 * points-per-win / race-to-target — there's no in-app currency in this
 * product, so we don't fake one.
 */

import { useEffect, useState } from 'react'
import { Star, Trophy }        from 'lucide-react'
import { Avatar }              from '@/components/ui/avatar'
import { cn }                  from '@/lib/utils'

export interface VersusPlayer {
  name:      string
  avatarUrl?: string | null
  rating?:    number
  wins?:      number
}

interface VersusIntroProps {
  player1:      VersusPlayer
  player2:      VersusPlayer
  targetScore:  number
  pointsPerWin?: number
  /** Called once the intro has finished (progress bar reaches 100%). */
  onDone?: () => void
  /** Total time on screen before onDone fires. */
  durationMs?: number
  className?:  string
}

// Short, single-line strategy notes — a fresh pass over ideas already in
// the app's rules content, trimmed to fit one calm sentence each.
const TIPS = [
  'Double while your opponent can still take — waiting risks losing the window.',
  'A blot exposed to more than 11 dice combinations is usually too dangerous.',
  'Early game favors flexibility: keep builders that can make more than one point.',
  'When far behind in the race, look for a back game or a strong anchor.',
  'A well-timed take is often correct even at only a quarter chance to win.',
]

export function VersusIntro({
  player1,
  player2,
  targetScore,
  pointsPerWin,
  onDone,
  durationMs = 2600,
  className,
}: VersusIntroProps) {
  const [progress] = useState(() => Math.random()) // stable per-mount tip pick
  const tip = TIPS[Math.floor(progress * TIPS.length)]

  const [fill, setFill] = useState(0)

  useEffect(() => {
    const start = Date.now()
    const raf = () => {
      const elapsed = Date.now() - start
      const pct = Math.min(100, Math.round((elapsed / durationMs) * 100))
      setFill(pct)
      if (pct < 100) {
        requestAnimationFrame(raf)
      } else {
        onDone?.()
      }
    }
    const id = requestAnimationFrame(raf)
    return () => cancelAnimationFrame(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [durationMs])

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex flex-col items-center justify-center',
        'bg-surface-canvas overflow-hidden animate-fade-in',
        className,
      )}
      role="status"
      aria-label={`${player1.name} versus ${player2.name}`}
    >
      {/* Two glows converging toward center — gold from the left, jade from the right */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 60% 55% at 12% 30%, hsl(var(--gold) / 0.16), transparent 60%),' +
            'radial-gradient(ellipse 60% 55% at 88% 30%, hsl(var(--jade) / 0.16), transparent 60%)',
        }}
      />

      <div className="relative w-full max-w-2xl px-6 flex flex-col items-center">
        {/* Players facing off */}
        <div className="flex w-full items-start justify-between gap-4">
          <PlayerColumn player={player1} accent="gold" />

          {/* VS mark */}
          <div className="flex shrink-0 flex-col items-center gap-1 pt-4">
            <span
              className="font-display text-5xl sm:text-6xl font-bold tracking-tight animate-dice-in"
              style={{
                backgroundImage: 'linear-gradient(135deg, hsl(var(--gold-bright)), hsl(var(--jade-bright)))',
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                color: 'transparent',
              }}
            >
              VS
            </span>
          </div>

          <PlayerColumn player={player2} accent="jade" />
        </div>

        {/* Stake — real tournament data, not an invented currency */}
        <div className="mt-8 flex flex-col items-center gap-1.5">
          <p className="text-xs font-medium uppercase tracking-[0.15em] text-ink-subtle">
            Race to
          </p>
          <p className="font-display text-3xl font-bold text-ink">
            {targetScore}
            {pointsPerWin && pointsPerWin !== 1 && (
              <span className="ml-2 align-middle text-sm font-medium text-ink-subtle">
                · {pointsPerWin} pts / win
              </span>
            )}
          </p>
        </div>

        {/* Tip */}
        <p className="mt-6 max-w-md text-center text-sm text-ink-muted">
          <span className="font-semibold text-gold">Tip </span>
          {tip}
        </p>

        {/* Progress */}
        <div className="mt-8 w-full max-w-xs">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-elevated">
            <div
              className="h-full rounded-full transition-[width] duration-100 ease-linear"
              style={{
                width: `${fill}%`,
                backgroundImage: 'linear-gradient(90deg, hsl(var(--gold)), hsl(var(--jade)))',
              }}
            />
          </div>
          <p className="mt-2 text-center text-xs text-ink-subtle">
            {fill < 100 ? 'Setting the board…' : 'Ready'}
          </p>
        </div>
      </div>
    </div>
  )
}

function PlayerColumn({
  player,
  accent,
}: {
  player: VersusPlayer
  accent: 'gold' | 'jade'
}) {
  const ring =
    accent === 'gold'
      ? 'from-gold-dim via-gold to-gold-bright shadow-gold'
      : 'from-jade-dim via-jade to-jade-bright'

  return (
    <div className="flex flex-1 flex-col items-center gap-2.5 text-center">
      <div className={cn('relative rounded-full bg-gradient-to-br p-[3px]', ring)}>
        <div className="rounded-full bg-surface-canvas p-1">
          <Avatar name={player.name} src={player.avatarUrl} size="xl" />
        </div>

        {typeof player.rating === 'number' && (
          <div
            className={cn(
              'absolute -bottom-1 -right-1 flex items-center gap-0.5 rounded-full',
              'border-2 border-surface-canvas bg-surface-raised px-1.5 py-0.5',
            )}
          >
            <Star className={cn('h-3 w-3', accent === 'gold' ? 'text-gold' : 'text-jade')} fill="currentColor" />
            <span className="font-mono text-[11px] font-semibold text-ink">{player.rating}</span>
          </div>
        )}
      </div>

      <p className="max-w-[7rem] truncate font-display text-base font-semibold text-ink">
        {player.name}
      </p>

      {typeof player.wins === 'number' && player.wins > 0 && (
        <div className="flex items-center gap-1 text-xs text-ink-subtle">
          <Trophy className="h-3 w-3" />
          {player.wins} wins
        </div>
      )}
    </div>
  )
}
