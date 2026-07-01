'use client'

/**
 * ScoreBoard — the central score display.
 *
 * Shows:
 *  - Player names (left / right)
 *  - Large current scores
 *  - "Race to N" label in the center
 *  - Two progress bars showing each player's path to the target
 */

import { Progress } from '@/components/ui/progress'
import { cn }       from '@/lib/utils'

interface ScoreBoardProps {
  player1Name:  string
  player2Name:  string
  player1Score: number
  player2Score: number
  targetScore:  number
  winnerId:     string | null
  player1Id:    string
  player2Id:    string
}

export function ScoreBoard({
  player1Name,
  player2Name,
  player1Score,
  player2Score,
  targetScore,
  winnerId,
  player1Id,
  player2Id,
}: ScoreBoardProps) {
  const p1Won   = winnerId === player1Id
  const p2Won   = winnerId === player2Id
  const isOver  = !!winnerId

  return (
    <div className="rounded-2xl border border-line bg-surface-raised p-5">
      {/* Score row */}
      <div className="flex items-stretch gap-4">
        {/* Player 1 */}
        <PlayerScore
          name={player1Name}
          score={player1Score}
          align="left"
          won={p1Won}
          lost={isOver && !p1Won}
          leading={!isOver && player1Score > player2Score}
        />

        {/* Center divider */}
        <div className="flex flex-col items-center justify-center gap-1 shrink-0">
          <div className="h-6 w-px bg-line/60" />
          <span className="text-xs font-semibold uppercase tracking-widest text-ink-subtle">
            vs
          </span>
          <div className="h-6 w-px bg-line/60" />
        </div>

        {/* Player 2 */}
        <PlayerScore
          name={player2Name}
          score={player2Score}
          align="right"
          won={p2Won}
          lost={isOver && !p2Won}
          leading={!isOver && player2Score > player1Score}
        />
      </div>

      {/* Race to label */}
      <div className="mt-4 flex items-center justify-center gap-2">
        <div className="h-px flex-1 bg-line/40" />
        <span className="text-xs font-medium text-ink-subtle">
          Race to {targetScore} {targetScore === 1 ? 'point' : 'points'}
        </span>
        <div className="h-px flex-1 bg-line/40" />
      </div>

      {/* Progress bars */}
      <div className="mt-3 space-y-2">
        <div className="flex items-center gap-3">
          <span className="w-16 shrink-0 truncate text-right text-xs text-ink-subtle">
            {player1Name.split(' ')[0]}
          </span>
          <Progress
            value={player1Score}
            max={targetScore}
            variant={p1Won ? 'win' : 'gold'}
            className="flex-1"
          />
          <span className="w-8 shrink-0 text-xs font-semibold text-ink">
            {player1Score}/{targetScore}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="w-16 shrink-0 truncate text-right text-xs text-ink-subtle">
            {player2Name.split(' ')[0]}
          </span>
          <Progress
            value={player2Score}
            max={targetScore}
            variant={p2Won ? 'win' : 'gold'}
            className="flex-1"
          />
          <span className="w-8 shrink-0 text-xs font-semibold text-ink">
            {player2Score}/{targetScore}
          </span>
        </div>
      </div>

      {/* Match over banner */}
      {isOver && (
        <div className="mt-4 flex items-center justify-center rounded-xl border border-win/30 bg-win/10 px-4 py-2">
          <span className="text-sm font-semibold text-win">
            {p1Won ? player1Name : player2Name} wins the match!
          </span>
        </div>
      )}
    </div>
  )
}

interface PlayerScoreProps {
  name:     string
  score:    number
  align:    'left' | 'right'
  won?:     boolean
  lost?:    boolean
  leading?: boolean
}

function PlayerScore({ name, score, align, won, lost, leading }: PlayerScoreProps) {
  return (
    <div className={cn('flex flex-1 flex-col gap-1', align === 'right' && 'items-end')}>
      <span className={cn(
        'truncate text-sm font-medium transition-colors',
        won     ? 'text-win'       :
        lost    ? 'text-ink-subtle' :
        leading ? 'text-gold'      : 'text-ink-muted',
      )}>
        {name}
      </span>
      <span className={cn(
        'font-mono text-4xl font-black leading-none tabular-nums transition-all',
        won     ? 'text-win'        :
        lost    ? 'text-ink-subtle' :
        leading ? 'text-gold'       : 'text-ink',
      )}>
        {score}
      </span>
      {won && (
        <span className="text-xs font-semibold text-win">Winner</span>
      )}
    </div>
  )
}
