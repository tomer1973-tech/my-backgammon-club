'use client'

import { useState, useTransition } from 'react'
import { useRouter }               from 'next/navigation'
import { SlidersHorizontal, Minus, Plus } from 'lucide-react'
import { setPointsAdjustment } from '@/actions/corrections'
import type { StandingsRow }   from '@/types'
import { cn } from '@/lib/utils'

export function PointsAdjustments({ rows }: { rows: StandingsRow[] }) {
  const router = useRouter()
  const [open, setOpen]   = useState(false)
  const [pending, start]  = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [values, setValues] = useState<Record<string, number>>(
    () => Object.fromEntries(rows.map(r => [r.memberId, r.adjustment])),
  )

  function save(memberId: string) {
    setError(null)
    start(async () => {
      const res = await setPointsAdjustment({ memberId, adjustment: values[memberId] })
      if (res.success) router.refresh()
      else setError(res.error)
    })
  }

  return (
    <div className="rounded-xl border border-line bg-surface-raised">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
      >
        <span className="flex items-center gap-3">
          <SlidersHorizontal className="h-5 w-5 text-gold" />
          <span>
            <span className="block text-sm font-semibold text-ink">Points adjustments</span>
            <span className="block text-xs text-ink-muted">Organizer only — add a bonus or penalty to a player&apos;s total</span>
          </span>
        </span>
        <span className="text-xs font-semibold text-gold">{open ? 'Hide' : 'Edit'}</span>
      </button>

      {open && (
        <div className="space-y-2 border-t border-line px-5 py-4">
          {error && <p className="rounded-lg bg-loss/10 px-3 py-2 text-sm text-loss">{error}</p>}
          {rows.map(r => {
            const v = values[r.memberId] ?? 0
            const dirty = v !== r.adjustment
            return (
              <div key={r.memberId} className="flex items-center gap-3">
                <span className="min-w-0 flex-1 truncate text-sm text-ink">{r.name}</span>
                <span className="w-16 text-right text-xs text-ink-subtle tabular-nums">{r.points - r.adjustment} base</span>
                <div className="flex items-center rounded-lg border border-line bg-surface-elevated">
                  <button type="button" aria-label={`Decrease ${r.name}`} onClick={() => setValues(s => ({ ...s, [r.memberId]: v - 1 }))} className="p-1.5 text-ink-muted hover:text-ink"><Minus className="h-3.5 w-3.5" /></button>
                  <span className={cn('w-10 text-center text-sm font-bold tabular-nums', v > 0 ? 'text-win' : v < 0 ? 'text-loss' : 'text-ink-muted')}>
                    {v > 0 ? `+${v}` : v}
                  </span>
                  <button type="button" aria-label={`Increase ${r.name}`} onClick={() => setValues(s => ({ ...s, [r.memberId]: v + 1 }))} className="p-1.5 text-ink-muted hover:text-ink"><Plus className="h-3.5 w-3.5" /></button>
                </div>
                <button
                  type="button"
                  disabled={!dirty || pending}
                  onClick={() => save(r.memberId)}
                  className="w-14 rounded-lg bg-gold py-1.5 text-xs font-bold text-surface-canvas disabled:opacity-30"
                >
                  Save
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
