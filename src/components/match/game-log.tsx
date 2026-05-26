'use client'

/**
 * GameLog — live scrollable list of games played within the current match.
 * Shows game number, winner, game type, cube value, points awarded, running score.
 */

import { useState }             from 'react'
import { Undo2, ChevronDown }   from 'lucide-react'
import { Button }               from '@/components/ui/button'
import { Badge }                from '@/components/ui/badge'
import { undoLastGame }         from '@/actions/match'
import { GAME_TYPE_LABEL }      from '@/types'
import { cn }                   from '@/lib/utils'
import type { MatchGame }       from '@/types'

interface GameLogProps {
  games:         MatchGame[]
  player1Id:     string
  player2Id:     string
  player1Name:   string
  player2Name:   string
  matchComplete: boolean
  matchId:       string
}

export function GameLog({
  games,
  player1Id,
  player1Name,
  player2Name,
  matchComplete,
  matchId,
}: GameLogProps) {
  const [undoing, setUndoing] = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const [collapsed, setCollapsed] = useState(false)

  const reversed = [...games].reverse()

  async function handleUndo() {
    setUndoing(true)
    setError(null)
    const result = await undoLastGame(matchId)
    setUndoing(false)
    if (!result.success) setError(result.error)
  }

  if (games.length === 0) return null

  return (
    <div className="rounded-xl border border-line bg-surface-raised overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-line/50 px-4 py-3">
        <button
          onClick={() => setCollapsed(v => !v)}
          className="flex items-center gap-2 text-sm font-semibold text-ink"
        >
          Game history ({games.length})
          <ChevronDown className={cn('h-4 w-4 text-ink-subtle transition-transform', collapsed && '-rotate-90')} />
        </button>

        {!matchComplete && games.length > 0 && (
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={handleUndo}
            isLoading={undoing}
            aria-label="Undo last game"
            title="Undo last game"
          >
            <Undo2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {!collapsed && (
        <>
          {error && (
            <p className="px-4 py-2 text-xs text-loss border-b border-line/50">{error}</p>
          )}

          <div className="divide-y divide-line/30 max-h-64 overflow-y-auto">
            {reversed.map(game => {
              const winner = game.winnerId === player1Id ? player1Name : player2Name
              const typeLabel = GAME_TYPE_LABEL[game.gameType]
              const isGammon = game.gameType !== 'NORMAL'

              return (
                <div
                  key={game.id}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm"
                >
                  {/* Game number */}
                  <span className="w-5 shrink-0 text-xs font-mono text-ink-subtle">
                    G{game.gameNumber}
                  </span>

                  {/* Winner */}
                  <span className="flex-1 truncate font-medium text-ink">
                    {winner}
                  </span>

                  {/* Badges */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {game.cubeValue > 1 && (
                      <Badge variant="gold" className="text-xs">
                        ×{game.cubeValue}
                      </Badge>
                    )}
                    {isGammon && (
                      <Badge variant="warning" className="text-xs">
                        {game.gameType === 'GAMMON' ? 'Gammon' : 'Bg'}
                      </Badge>
                    )}
                  </div>

                  {/* Points */}
                  <span className="w-12 shrink-0 text-right text-xs font-semibold text-win">
                    +{game.pointsAwarded}
                  </span>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
