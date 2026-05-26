'use client'

/**
 * MatchCompleteDialog — shown when the match ends.
 *
 * Allows selecting the opening type for analytics.
 * Shows final score and winner.
 */

import { useState }                   from 'react'
import { Trophy }                     from 'lucide-react'
import { Dialog, DialogFooter }       from '@/components/ui/dialog'
import { Button }                     from '@/components/ui/button'
import { finalizeMatch }              from '@/actions/match'
import { OPENING_TYPE_LABEL }         from '@/types'
import { cn }                         from '@/lib/utils'
import type { OpeningType }           from '@/types'

const OPENING_TYPES: OpeningType[] = [
  'RUNNING_GAME', 'BLITZ', 'PRIME_VS_PRIME',
  'BACK_GAME', 'HOLDING_GAME', 'ANCHOR_GAME', 'CUSTOM',
]

interface MatchCompleteDialogProps {
  open:         boolean
  matchId:      string
  winnerName:   string
  loserName:    string
  player1Score: number
  player2Score: number
  targetScore:  number
  onClose:      () => void
}

export function MatchCompleteDialog({
  open,
  matchId,
  winnerName,
  loserName,
  player1Score,
  player2Score,
  targetScore,
  onClose,
}: MatchCompleteDialogProps) {
  const [opening, setOpening]     = useState<OpeningType | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSave() {
    setSubmitting(true)
    await finalizeMatch({ matchId, openingType: opening ?? undefined })
    setSubmitting(false)
    onClose()
  }

  return (
    <Dialog open={open} onClose={onClose} title="Match complete">
      <div className="space-y-5">
        {/* Winner banner */}
        <div className="flex flex-col items-center gap-3 rounded-xl border border-win/30 bg-win/10 py-5 text-center">
          <Trophy className="h-10 w-10 text-win" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-win/70">Winner</p>
            <p className="text-xl font-bold text-win">{winnerName}</p>
          </div>
          <p className="text-sm text-ink-muted">
            {Math.max(player1Score, player2Score)} – {Math.min(player1Score, player2Score)}&nbsp;
            (race to {targetScore})
          </p>
        </div>

        {/* Opening type selection */}
        <div>
          <p className="mb-2 text-sm font-medium text-ink-muted">
            Opening style <span className="text-ink-subtle">(optional)</span>
          </p>
          <div className="grid grid-cols-2 gap-2">
            {OPENING_TYPES.map(t => (
              <button
                key={t}
                onClick={() => setOpening(prev => prev === t ? null : t)}
                className={cn(
                  'rounded-lg border px-3 py-2 text-left text-xs font-medium transition-all',
                  opening === t
                    ? 'border-gold bg-gold/10 text-gold'
                    : 'border-line bg-surface-elevated text-ink-muted hover:border-gold/40',
                )}
              >
                {OPENING_TYPE_LABEL[t]}
              </button>
            ))}
          </div>
        </div>
      </div>

      <DialogFooter className="mt-4">
        <Button variant="ghost" onClick={onClose} disabled={submitting}>
          Skip
        </Button>
        <Button onClick={handleSave} isLoading={submitting}>
          Save &amp; close
        </Button>
      </DialogFooter>
    </Dialog>
  )
}
