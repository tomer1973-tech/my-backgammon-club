'use client'

/**
 * RecordGamePanel — the in-match game entry control.
 *
 * Flow:
 *  1. Tap winner (Player 1 / Player 2 large buttons)
 *  2. Select game type (Normal / Gammon / Backgammon)
 *  3. Confirm → calls recordGameInMatch
 */

import { useState }              from 'react'
import { CheckCircle2 }          from 'lucide-react'
import { Button }                from '@/components/ui/button'
import { recordGameInMatch }     from '@/actions/match'
import { GAME_TYPE_LABEL, GAME_TYPE_MULTIPLIER } from '@/types'
import { cn }                    from '@/lib/utils'
import type { GameType }         from '@/types'

interface RecordGamePanelProps {
  matchId:      string
  player1Id:    string
  player2Id:    string
  player1Name:  string
  player2Name:  string
  cubeValue:    number
  onGameRecorded: (complete: boolean, winnerId?: string | null) => void
}

const GAME_TYPES: GameType[] = ['NORMAL', 'GAMMON', 'BACKGAMMON']

export function RecordGamePanel({
  matchId,
  player1Id,
  player2Id,
  player1Name,
  player2Name,
  cubeValue,
  onGameRecorded,
}: RecordGamePanelProps) {
  const [selectedWinner, setSelectedWinner] = useState<string | null>(null)
  const [gameType, setGameType]             = useState<GameType>('NORMAL')
  const [submitting, setSubmitting]         = useState(false)
  const [error, setError]                   = useState<string | null>(null)

  const pointsPreview = cubeValue * GAME_TYPE_MULTIPLIER[gameType]

  async function handleRecord() {
    if (!selectedWinner) return
    setSubmitting(true)
    setError(null)

    const result = await recordGameInMatch({
      matchId,
      winnerId: selectedWinner,
      gameType,
    })

    setSubmitting(false)

    if (result.success) {
      // Reset selections
      setSelectedWinner(null)
      setGameType('NORMAL')
      onGameRecorded(result.data.matchComplete, result.data.winnerId)
    } else {
      setError(result.error)
    }
  }

  return (
    <div className="rounded-xl border border-line bg-surface-raised p-5 space-y-5">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-subtle">
        Record a game
      </h3>

      {/* Winner selection */}
      <div className="space-y-2">
        <p className="text-xs text-ink-muted">Who won?</p>
        <div className="grid grid-cols-2 gap-3">
          <WinnerButton
            name={player1Name}
            selected={selectedWinner === player1Id}
            onClick={() => setSelectedWinner(player1Id)}
          />
          <WinnerButton
            name={player2Name}
            selected={selectedWinner === player2Id}
            onClick={() => setSelectedWinner(player2Id)}
          />
        </div>
      </div>

      {/* Game type selection */}
      <div className="space-y-2">
        <p className="text-xs text-ink-muted">Game type</p>
        <div className="grid grid-cols-3 gap-2">
          {GAME_TYPES.map(type => (
            <button
              key={type}
              onClick={() => setGameType(type)}
              className={cn(
                'rounded-lg border px-2 py-2 text-xs font-medium transition-all',
                gameType === type
                  ? 'border-gold bg-gold/10 text-gold'
                  : 'border-line bg-surface-elevated text-ink-muted hover:border-gold/40',
              )}
            >
              <span className="block">{GAME_TYPE_LABEL[type].split(' ')[0]}</span>
              <span className="block text-[10px] opacity-70">
                ×{GAME_TYPE_MULTIPLIER[type]}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Points preview */}
      {selectedWinner && (
        <div className="rounded-lg border border-gold/20 bg-gold/5 px-3 py-2.5 text-center">
          <p className="text-xs text-ink-muted">Points awarded</p>
          <p className="text-xl font-bold text-gold">
            +{pointsPreview}
          </p>
          <p className="text-xs text-ink-subtle">
            cube {cubeValue} × {GAME_TYPE_MULTIPLIER[gameType]}× ({GAME_TYPE_LABEL[gameType]})
          </p>
        </div>
      )}

      {error && (
        <p className="text-sm text-loss">{error}</p>
      )}

      <Button
        onClick={handleRecord}
        disabled={!selectedWinner}
        isLoading={submitting}
        className="w-full gap-2"
      >
        <CheckCircle2 className="h-4 w-4" />
        Confirm game
      </Button>
    </div>
  )
}

function WinnerButton({
  name,
  selected,
  onClick,
}: {
  name:     string
  selected: boolean
  onClick:  () => void
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'rounded-xl border-2 px-3 py-4 text-sm font-semibold transition-all duration-150',
        'active:scale-[0.97]',
        selected
          ? 'border-gold bg-gold/15 text-gold shadow-gold'
          : 'border-line bg-surface-elevated text-ink-muted hover:border-gold/40 hover:text-ink',
      )}
    >
      <span className="truncate block">{name}</span>
      {selected && (
        <CheckCircle2 className="mx-auto mt-1 h-4 w-4 text-gold" />
      )}
    </button>
  )
}
