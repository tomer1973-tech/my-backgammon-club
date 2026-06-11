'use client'

/**
 * TournamentStatusControls — organizer/owner controls for status transitions.
 * Rendered only when the viewer has management permissions.
 */

import { useState }               from 'react'
import { Flag, Shuffle }          from 'lucide-react'
import { Button }                 from '@/components/ui/button'
import { Dialog, DialogFooter }   from '@/components/ui/dialog'
import { updateTournamentStatus, endTournament } from '@/actions/tournament'
import { generateRoundRobinSchedule }            from '@/actions/match'
import type { TournamentWithMembers, TournamentStatus } from '@/types'

const FORMAT_LABEL: Record<string, string> = {
  ROUND_ROBIN:        'Round Robin',
  SINGLE_ELIMINATION: 'Single Elimination',
  DOUBLE_ELIMINATION: 'Double Elimination',
  SWISS:              'Swiss',
}

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

  // Auto-schedule (round robin)
  const [genOpen, setGenOpen]       = useState(false)
  const [generating, setGenerating] = useState(false)
  const [genResult, setGenResult]   = useState<string | null>(null)
  const [genError, setGenError]     = useState<string | null>(null)
  const [canReplace, setCanReplace] = useState(false)

  const transitions     = TRANSITIONS[tournament.status] ?? []
  const isRoundRobin    = tournament.format === 'ROUND_ROBIN'
  const schedulable     = tournament.status === 'ACTIVE' || tournament.status === 'DRAFT'

  async function handleGenerate(replace: boolean) {
    setGenerating(true)
    setGenError(null)
    setGenResult(null)
    const result = await generateRoundRobinSchedule({ tournamentId: tournament.id, replace })
    setGenerating(false)
    if (result.success) {
      setGenOpen(false)
      setCanReplace(false)
      setGenResult(`Schedule created: ${result.data.created} matches across ${result.data.rounds} rounds.`)
    } else {
      setGenError(result.error)
      // If matches already exist, offer to replace the upcoming ones.
      setCanReplace(/already has matches/i.test(result.error))
    }
  }

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
        {isRoundRobin && schedulable && (
          <Button
            variant="default"
            size="sm"
            className="gap-1.5"
            onClick={() => { setGenError(null); setGenResult(null); setCanReplace(false); setGenOpen(true) }}
          >
            <Shuffle className="h-3.5 w-3.5" />
            Generate schedule
          </Button>
        )}
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
      {/* Coming-soon note for formats without auto-scheduling yet */}
      {!isRoundRobin && schedulable && (
        <p className="mt-3 text-xs text-ink-subtle">
          Auto-scheduling for {FORMAT_LABEL[tournament.format] ?? tournament.format} brackets is coming soon.
          For now you can add matches manually.
        </p>
      )}
      {error && (
        <p className="mt-3 text-sm text-loss">{error}</p>
      )}
      {endResult && (
        <p className="mt-3 text-sm text-win">{endResult}</p>
      )}
      {genResult && (
        <p className="mt-3 text-sm text-win">{genResult}</p>
      )}

      {/* Generate schedule confirmation */}
      <Dialog
        open={genOpen}
        onClose={() => !generating && setGenOpen(false)}
        title="Generate round-robin schedule"
        size="sm"
      >
        <p className="text-sm text-ink-muted leading-relaxed">
          This creates the full round-robin schedule for{' '}
          <span className="font-semibold text-ink">{tournament.name}</span> — every player meets
          every other player once. Players are seeded by their current standings, and matches are
          grouped into rounds. Matches appear as <span className="font-semibold text-ink">Upcoming</span>{' '}
          and can be started whenever you&apos;re ready.
        </p>
        {genError && (
          <p className="mt-3 rounded-lg border border-loss/40 bg-loss/10 px-3 py-2 text-sm text-loss">
            {genError}
          </p>
        )}
        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={() => setGenOpen(false)} disabled={generating}>
            Cancel
          </Button>
          {canReplace ? (
            <Button
              variant="default"
              size="sm"
              className="gap-1.5"
              onClick={() => handleGenerate(true)}
              isLoading={generating}
            >
              <Shuffle className="h-3.5 w-3.5" />
              Replace &amp; regenerate
            </Button>
          ) : (
            <Button
              variant="default"
              size="sm"
              className="gap-1.5"
              onClick={() => handleGenerate(false)}
              isLoading={generating}
            >
              <Shuffle className="h-3.5 w-3.5" />
              Generate
            </Button>
          )}
        </DialogFooter>
      </Dialog>

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
