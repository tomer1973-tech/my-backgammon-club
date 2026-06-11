'use client'

/**
 * SuggestedMatches — organizer panel that recommends balanced, fresh matchups
 * and lets the organizer create any of them as a scheduled match in one click.
 * Suggestions come from getSuggestedMatches (freshness + closeness in standings).
 */

import { useState, useTransition } from 'react'
import { useRouter }               from 'next/navigation'
import { Sparkles, Plus, Check }   from 'lucide-react'
import { createMatch }             from '@/actions/match'
import type { SuggestedMatch }     from '@/actions/match'

interface SuggestedMatchesProps {
  tournamentId: string
  targetScore:  number
  suggestions:  SuggestedMatch[]
}

export function SuggestedMatches({ tournamentId, targetScore, suggestions }: SuggestedMatchesProps) {
  const router = useRouter()
  const [busyKey, setBusyKey]     = useState<string | null>(null)
  const [createdKeys, setCreated] = useState<Set<string>>(new Set())
  const [error, setError]         = useState<string | null>(null)
  const [, startTransition]       = useTransition()

  if (suggestions.length === 0) return null

  const keyOf = (s: SuggestedMatch) => `${s.player1Id}-${s.player2Id}`

  function handleCreate(s: SuggestedMatch) {
    const key = keyOf(s)
    setBusyKey(key)
    setError(null)
    startTransition(async () => {
      const res = await createMatch({
        tournamentId,
        player1Id:   s.player1Id,
        player2Id:   s.player2Id,
        targetScore,
        scheduledAt: new Date().toISOString(),
      })
      setBusyKey(null)
      if (res.success) {
        setCreated(prev => new Set(prev).add(key))
        router.refresh()
      } else {
        setError(res.error)
      }
    })
  }

  return (
    <section className="rounded-xl border border-line bg-surface-raised p-5">
      <div className="mb-1 flex items-center gap-2">
        <Sparkles className="h-3.5 w-3.5 text-gold" />
        <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-subtle">
          Suggested matches
        </h2>
      </div>
      <p className="mb-4 text-xs text-ink-subtle">
        Balanced, fresh matchups based on the standings. Create any to schedule it.
      </p>

      <div className="flex flex-col divide-y divide-line/40">
        {suggestions.map(s => {
          const key     = keyOf(s)
          const created = createdKeys.has(key)
          const busy    = busyKey === key
          return (
            <div key={key} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-ink">
                  {s.player1Name} <span className="text-xs font-normal text-ink-subtle">vs</span> {s.player2Name}
                </p>
                <p className="mt-0.5 text-xs text-ink-subtle">{s.reason}</p>
              </div>

              {created ? (
                <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-win">
                  <Check className="h-3.5 w-3.5" />
                  Scheduled
                </span>
              ) : (
                <button
                  onClick={() => handleCreate(s)}
                  disabled={busy}
                  className="flex shrink-0 items-center gap-1.5 rounded-lg border border-gold/40
                    bg-gold/10 px-3 py-1.5 text-xs font-semibold text-gold
                    hover:bg-gold/20 transition-colors disabled:opacity-50"
                >
                  <Plus className="h-3.5 w-3.5" />
                  {busy ? 'Creating…' : 'Create match'}
                </button>
              )}
            </div>
          )
        })}
      </div>

      {error && <p className="mt-3 text-sm text-loss">{error}</p>}
    </section>
  )
}
