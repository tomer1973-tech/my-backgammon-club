'use client'

/**
 * TournamentStatusControls — organizer/owner controls for status transitions.
 * Rendered only when the viewer has management permissions.
 */

import { useState }               from 'react'
import { Button }                 from '@/components/ui/button'
import { updateTournamentStatus, archiveTournament } from '@/actions/tournament'
import type { TournamentWithMembers, TournamentStatus } from '@/types'
import { cn }                     from '@/lib/utils'

const TRANSITIONS: Record<TournamentStatus, { label: string; next: TournamentStatus; variant: 'default' | 'secondary' | 'ghost' }[]> = {
  DRAFT:     [{ label: 'Open for players → Active',  next: 'ACTIVE',    variant: 'default' }],
  ACTIVE:    [{ label: 'Mark as Completed',           next: 'COMPLETED', variant: 'secondary' }],
  COMPLETED: [{ label: 'Archive',                     next: 'ARCHIVED',  variant: 'ghost' }],
  ARCHIVED:  [],
}

interface TournamentStatusControlsProps {
  tournament: TournamentWithMembers
}

export function TournamentStatusControls({ tournament }: TournamentStatusControlsProps) {
  const [loading, setLoading] = useState<TournamentStatus | null>(null)
  const [error, setError]     = useState<string | null>(null)

  const transitions = TRANSITIONS[tournament.status] ?? []
  if (transitions.length === 0) return null

  async function handleTransition(next: TournamentStatus) {
    setLoading(next)
    setError(null)
    const result = await updateTournamentStatus({ tournamentId: tournament.id, status: next })
    setLoading(null)
    if (!result.success) setError(result.error)
  }

  return (
    <div className="rounded-xl border border-line bg-surface-raised p-5">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-ink-subtle">
        Manage tournament
      </h3>
      <div className="flex flex-wrap gap-3">
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
    </div>
  )
}
