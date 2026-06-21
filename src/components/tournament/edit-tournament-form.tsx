'use client'

import { useState, useTransition } from 'react'
import Link                        from 'next/link'
import { ChevronLeft, Save }       from 'lucide-react'
import { Button }                  from '@/components/ui/button'
import { Input }                   from '@/components/ui/input'
import { updateTournament }        from '@/actions/tournament'
import { TOURNAMENT_FORMAT_LABEL } from '@/types'
import type { TournamentWithMembers } from '@/types'

interface Props { tournament: TournamentWithMembers }

export function EditTournamentForm({ tournament: t }: Props) {
  const [busy, startTransition] = useTransition()
  const [error, setError] = useState('')

  const startIso = t.startDate
    ? new Date(t.startDate).toISOString().split('T')[0]
    : ''

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd  = new FormData(e.currentTarget)
    const pts = parseInt(fd.get('pointsPerWin') as string, 10)
    const ml  = fd.get('matchLength') ? parseInt(fd.get('matchLength') as string, 10) : undefined
    const mp  = fd.get('maxPlayers')  ? parseInt(fd.get('maxPlayers')  as string, 10) : undefined

    if (isNaN(pts) || pts < 1) { setError('Points per win must be at least 1.'); return }

    setError('')
    startTransition(async () => {
      const res = await updateTournament({
        tournamentId: t.id,
        name:         (fd.get('name') as string).trim(),
        description:  (fd.get('description') as string).trim() || undefined,
        location:     (fd.get('location')    as string).trim() || undefined,
        pointsPerWin: pts,
        matchLength:  ml,
        maxPlayers:   mp,
        startDate:    (fd.get('startDate') as string) || undefined,
      })
      // updateTournament calls redirect() on success, so we only land here on error
      if (res && !res.success) setError(res.error ?? 'Failed to save.')
    })
  }

  return (
    <>
      <div>
        <Link
          href={`/tournaments/${t.id}`}
          className="inline-flex items-center gap-1 text-sm text-ink-muted hover:text-ink transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          {t.name}
        </Link>
        <h1 className="mt-3 text-2xl font-bold text-ink">Edit Tournament</h1>
        <p className="mt-0.5 text-sm text-ink-muted">
          Format: <span className="font-medium text-ink">{TOURNAMENT_FORMAT_LABEL[t.format]}</span>
          {' · '}Format cannot be changed after creation.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="rounded-xl border border-line bg-surface-raised p-5 space-y-4">

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-ink-subtle">
              Name <span className="text-loss">*</span>
            </label>
            <Input name="name" required defaultValue={t.name} placeholder="Tournament name" />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-ink-subtle">Description</label>
            <textarea
              name="description"
              rows={3}
              defaultValue={t.description ?? ''}
              placeholder="Optional description…"
              className="w-full rounded-lg border border-line bg-surface-elevated px-3 py-2.5 text-sm text-ink placeholder:text-ink-subtle focus:border-gold/50 focus:outline-none resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-ink-subtle">Location</label>
              <Input name="location" defaultValue={t.location ?? ''} placeholder="City or venue" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-ink-subtle">Start date</label>
              <Input name="startDate" type="date" defaultValue={startIso} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-ink-subtle">
                Pts / win <span className="text-loss">*</span>
              </label>
              <Input
                name="pointsPerWin"
                type="number"
                min={1}
                max={1000}
                defaultValue={t.pointsPerWin}
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-ink-subtle">Race to</label>
              <Input
                name="matchLength"
                type="number"
                min={1}
                max={99}
                defaultValue={t.matchLength ?? ''}
                placeholder="e.g. 5"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-ink-subtle">Max players</label>
              <Input
                name="maxPlayers"
                type="number"
                min={2}
                max={500}
                defaultValue={t.maxPlayers ?? ''}
                placeholder="Unlimited"
              />
            </div>
          </div>
        </div>

        {error && (
          <p className="rounded-lg border border-loss/30 bg-loss/8 px-4 py-2.5 text-sm text-loss">{error}</p>
        )}

        <div className="flex gap-3">
          <Button type="submit" disabled={busy} className="flex-1 gap-2">
            <Save className="h-4 w-4" />
            {busy ? 'Saving…' : 'Save changes'}
          </Button>
          <Button asChild variant="secondary">
            <Link href={`/tournaments/${t.id}`}>Cancel</Link>
          </Button>
        </div>
      </form>
    </>
  )
}
