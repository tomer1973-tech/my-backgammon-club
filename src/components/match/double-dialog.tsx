'use client'

/**
 * DoubleDialog — shown when a player offers a double.
 *
 * Presents:
 *  - Who offered, proposed new cube value
 *  - Accept / Decline buttons
 *  - Clear explanation of what each choice means
 */

import { useState }         from 'react'
import { Dialog, DialogFooter } from '@/components/ui/dialog'
import { Button }           from '@/components/ui/button'
import { acceptDouble, declineDouble } from '@/actions/match'

interface DoubleDialogProps {
  open:         boolean
  matchId:      string
  offererId:    string   // the player who offered (wins if declined)
  acceptorId:   string   // the player who must accept or decline
  offererName:  string
  acceptorName: string
  currentCubeValue: number
  onClose:      () => void
  onResolved:   (accepted: boolean, matchComplete?: boolean, winnerId?: string | null) => void
}

export function DoubleDialog({
  open,
  matchId,
  offererId,
  acceptorId,
  offererName,
  acceptorName,
  currentCubeValue,
  onClose,
  onResolved,
}: DoubleDialogProps) {
  const [loading, setLoading] = useState<'accept' | 'decline' | null>(null)
  const [error, setError]     = useState<string | null>(null)
  const proposedValue         = currentCubeValue * 2

  async function handleAccept() {
    setLoading('accept')
    setError(null)
    const result = await acceptDouble({ matchId, acceptorId })
    setLoading(null)
    if (result.success) {
      onResolved(true)
      onClose()
    } else {
      setError(result.error)
    }
  }

  async function handleDecline() {
    setLoading('decline')
    setError(null)
    const result = await declineDouble({ matchId, offererId })
    setLoading(null)
    if (result.success) {
      onResolved(false, result.data.matchComplete, result.data.winnerId)
      onClose()
    } else {
      setError(result.error)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} size="sm">
      <div className="space-y-4 text-center">
        {/* Cube display */}
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-gold/60 bg-surface-canvas shadow-[0_0_24px_rgba(201,168,76,0.3)]">
          <span className="font-mono text-3xl font-black text-gold">{proposedValue}</span>
        </div>

        <div>
          <h3 className="text-base font-semibold text-ink">Double offered</h3>
          <p className="mt-1 text-sm text-ink-muted">
            <span className="font-medium text-ink">{offererName}</span> doubles to{' '}
            <span className="font-bold text-gold">{proposedValue}</span>
          </p>
        </div>

        {/* Options explained */}
        <div className="grid grid-cols-2 gap-3 text-left">
          <div className="rounded-lg border border-line bg-surface-elevated p-3">
            <p className="text-xs font-semibold text-win mb-1">Accept</p>
            <p className="text-xs text-ink-muted leading-relaxed">
              Game continues at ×{proposedValue}. {acceptorName} now owns the cube.
            </p>
          </div>
          <div className="rounded-lg border border-line bg-surface-elevated p-3">
            <p className="text-xs font-semibold text-loss mb-1">Decline</p>
            <p className="text-xs text-ink-muted leading-relaxed">
              {acceptorName} concedes. {offererName} wins{' '}
              {currentCubeValue} {currentCubeValue === 1 ? 'point' : 'points'}.
            </p>
          </div>
        </div>

        {error && (
          <p className="text-sm text-loss">{error}</p>
        )}
      </div>

      <DialogFooter className="mt-4">
        <Button
          variant="destructive"
          onClick={handleDecline}
          isLoading={loading === 'decline'}
          disabled={!!loading}
        >
          Decline (−{currentCubeValue})
        </Button>
        <Button
          onClick={handleAccept}
          isLoading={loading === 'accept'}
          disabled={!!loading}
        >
          Accept (×{proposedValue})
        </Button>
      </DialogFooter>
    </Dialog>
  )
}
