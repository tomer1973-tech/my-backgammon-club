'use client'

/**
 * TournamentStatusControls — organizer/owner controls for status transitions.
 * Rendered only when the viewer has management permissions.
 */

import { useState }               from 'react'
import { Flag }                   from 'lucide-react'
import { Button }                 from '@/components/ui/button'
import { Dialog, DialogFooter }   from '@/components/ui/dialog'
import { updateTournamentStatus, endTournament } from '@/actions/tournament'
import type { TournamentWithMembers, TournamentStatus } from '@/types'

const TRANSITIONS: Partial<Record<TournamentStatus, { label: string; next: TournamentStatus; variant: 'default' | 'secondary' | 'ghost' }[]>> = {
  DRAFT:     [{ label: 'Open for players → Active',  next: 'ACTIVE',    variant: 'default' }],
  COMPLETED: [{ label: 'Archive',                     next: 'ARCHIVED',  variant: 'ghost' }],
  ARCHIVED:  [],
}

interface TournamentStatusControlsProps {
  tournament: TournamentWithMembers
}

export function TournamentStatusControls({ tournament }: TournamentStatusControlsProps) {
  const [loading, setLoading]       = useState<TournamentStatus | null>(null)
  const [error, setError]           = useState<string | null>(null)
  const [endOpen, setEndOpen]       = useState(false)
  const [ending, setEnding]         = useState(false)
  const [endResult, setEndResult]   = useState<string | null>(null)

  const transitions = TRANSITIONS[tournament.status] ?? []

  async function handleTransition(next: TournamentStatus) {
    setLoading(next)
    setError(null)
    const result = await updateTournamentStatus({ tournamentId: tournament.id, status: next })
    setLoading(null)
    if (!result.success) setError(result.error)
  }

  async function handleEndTournament() {
    setEnding(true)
    setError(null)
    const result = await endTournament({ tournamentId: tournament.id })
    setEnding(false)
    if (!result.success) {
      setError(result.error)
      return
    }
    setEndOpen(false)
    setEndResult(
      result.data.closedMatches > 0
        ? `Tournament ended. Closed ${result.data.closedMatches} unfinished match${result.data.closedMatches === 1 ? '' : 'es'}.`
        : 'Tournament ended.',
    )
  }

  if (transitions.length === 0 && tournament.status !== 'ACTIVE') return null

  return (
    <div className="rounded-xl border border-line bg-surface-raised p-5">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-ink-subtle">
        Manage tournament
      </h3>
      <div className="flex flex-wrap gap-3">
        {tournament.status === 'ACTIVE' && (
          <Button
            variant="secondary"
            size="sm"
            className="gap-1.5"
            onClick={() => setEndOpen(true)}
          >
            <Flag className="h-3.5 w-3.5" />
            End tournament
          </Button>
        )}
        {transitions.map(({ label, next, variant }) => (
          <Button
            key={next}
            variant={variant}
            size="sm"
            onClick={() => handleTransition(next)}
            isLoading={loading === next}
            disabled={!!loading}
          >
            {label}
          </Button>
        ))}
      </div>
      {error && (
        <p className="mt-3 text-sm text-loss">{error}</p>
      )}
      {endResult && (
        <p className="mt-3 text-sm text-win">{endResult}</p>
      )}

      {/* End tournament confirmation */}
      <Dialog
        open={endOpen}
        onClose={() => !ending && setEndOpen(false)}
        title="End tournament?"
        size="sm"
      >
        <p className="text-sm text-ink-muted leading-relaxed">
          This marks <span className="font-semibold text-ink">{tournament.name}</span> as{' '}
          <span className="font-semibold text-ink">Completed</span>. Any matches that are still
          pending or in progress will be closed without a winner — they won&apos;t count toward
          standings.
        </p>
        <p className="mt-2 text-sm text-ink-muted">
          This can&apos;t be undone.
        </p>
        {error && <p className="mt-3 text-sm text-loss">{error}</p>}
        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={() => setEndOpen(false)} disabled={ending}>
            Cancel
          </Button>
          <Button
            variant="default"
            size="sm"
            className="gap-1.5"
            onClick={handleEndTournament}
            isLoading={ending}
          >
            <Flag className="h-3.5 w-3.5" />
            End tournament
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  )
}
