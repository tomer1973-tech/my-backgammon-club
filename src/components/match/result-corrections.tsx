'use client'

import { useState, useTransition } from 'react'
import { useRouter }               from 'next/navigation'
import { PencilLine, Plus, Trash2, Check, X, ShieldCheck } from 'lucide-react'
import { editMatchGame, addMatchGame, deleteMatchGame, overrideMatchScore } from '@/actions/corrections'
import { GAME_TYPE_MULTIPLIER, type GameType, type Match } from '@/types'
import { cn } from '@/lib/utils'

const GAME_TYPES: { value: GameType; label: string }[] = [
  { value: 'NORMAL',     label: 'Single' },
  { value: 'GAMMON',     label: 'Gammon ×2' },
  { value: 'BACKGAMMON', label: 'Backgammon ×3' },
]
const CUBES = [1, 2, 4, 8, 16, 32, 64]

interface Draft { winnerSide: 1 | 2; gameType: GameType; cubeValue: number }

export function ResultCorrections({ match }: { match: Match }) {
  const router = useRouter()
  const [open, setOpen]       = useState(false)
  const [pending, start]      = useTransition()
  const [error, setError]     = useState<string | null>(null)
  const [editing, setEditing] = useState<string | null>(null)
  const [draft, setDraft]     = useState<Draft>({ winnerSide: 1, gameType: 'NORMAL', cubeValue: 1 })
  const [adding, setAdding]   = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [s1, setS1] = useState(String(match.player1Score))
  const [s2, setS2] = useState(String(match.player2Score))

  const sideOf = (memberId: string): 1 | 2 => (memberId === match.player1Id ? 1 : 2)
  const nameOf = (side: 1 | 2) => (side === 1 ? match.player1Name : match.player2Name)

  function exec(fn: () => Promise<{ success: boolean; error?: string }>, after?: () => void) {
    setError(null)
    start(async () => {
      const res = await fn()
      if (res.success) {
        after?.()
        router.refresh()
      } else {
        setError(res.error ?? 'Could not save the change.')
      }
    })
  }

  const scoreChanged = s1 !== String(match.player1Score) || s2 !== String(match.player2Score)

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-between gap-3 rounded-xl border border-dashed border-gold/40 bg-surface-raised px-5 py-4 text-left transition-colors hover:border-gold"
      >
        <span className="flex items-center gap-3">
          <ShieldCheck className="h-5 w-5 text-gold" />
          <span>
            <span className="block text-sm font-semibold text-ink">Correct result</span>
            <span className="block text-xs text-ink-muted">Organizer only — fix the score or individual games</span>
          </span>
        </span>
        <PencilLine className="h-4 w-4 text-ink-subtle" />
      </button>
    )
  }

  return (
    <div className="space-y-5 rounded-xl border border-gold/40 bg-surface-raised p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold text-ink">
            <ShieldCheck className="h-4 w-4 text-gold" /> Correct result
          </p>
          <p className="mt-0.5 text-xs text-ink-muted">
            Changes recalculate the winner and the tournament standings automatically.
          </p>
        </div>
        <button type="button" onClick={() => setOpen(false)} className="rounded-lg p-1 text-ink-subtle hover:text-ink" aria-label="Close">
          <X className="h-4 w-4" />
        </button>
      </div>

      {error && <p className="rounded-lg bg-loss/10 px-3 py-2 text-sm text-loss">{error}</p>}

      {/* Final score override */}
      <section className="space-y-2">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink-subtle">Final score</p>
        <div className="flex flex-wrap items-end gap-3">
          {([[match.player1Name, s1, setS1], [match.player2Name, s2, setS2]] as const).map(([name, val, set], i) => (
            <label key={i} className="flex-1 min-w-[120px]">
              <span className="mb-1 block truncate text-xs text-ink-muted">{name}</span>
              <input
                type="number" min={0} max={999} inputMode="numeric"
                value={val}
                onChange={e => set(e.target.value)}
                className="w-full rounded-lg border border-line bg-surface-elevated px-3 py-2 text-lg font-bold tabular-nums text-ink focus:border-gold focus:outline-none"
              />
            </label>
          ))}
          <button
            type="button"
            disabled={!scoreChanged || pending}
            onClick={() => exec(() => overrideMatchScore({ matchId: match.id, player1Score: Number(s1), player2Score: Number(s2) }))}
            className="rounded-lg bg-gold px-4 py-2.5 text-sm font-bold text-surface-canvas disabled:opacity-40"
          >
            Save score
          </button>
        </div>
        <p className="text-[11px] text-ink-subtle">
          Target {match.targetScore}. Use this when the games weren&apos;t logged; editing a game below recalculates the score from the games instead.
        </p>
      </section>

      {/* Per-game corrections */}
      <section className="space-y-2">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink-subtle">Games</p>
        <div className="divide-y divide-line overflow-hidden rounded-lg border border-line">
          {match.games.length === 0 && !adding && (
            <p className="px-4 py-3 text-sm text-ink-muted">No individual games were logged for this match.</p>
          )}
          {match.games.map(g => (
            editing === g.id ? (
              <GameEditor
                key={g.id}
                label={`Game ${g.gameNumber}`}
                draft={draft} setDraft={setDraft}
                p1={match.player1Name} p2={match.player2Name}
                pending={pending}
                onCancel={() => setEditing(null)}
                onSave={() => exec(() => editMatchGame({ gameId: g.id, ...draft }), () => setEditing(null))}
              />
            ) : (
              <div key={g.id} className="flex items-center gap-3 bg-surface-canvas/40 px-4 py-2.5">
                <span className="w-14 shrink-0 text-xs font-semibold text-ink-subtle">Game {g.gameNumber}</span>
                <span className="min-w-0 flex-1 truncate text-sm text-ink">
                  <span className="font-semibold">{nameOf(sideOf(g.winnerId))}</span>
                  <span className="text-ink-muted"> · {GAME_TYPES.find(t => t.value === g.gameType)?.label}{g.cubeValue > 1 ? ` · cube ${g.cubeValue}` : ''}</span>
                </span>
                <span className="shrink-0 text-sm font-bold tabular-nums text-gold">+{g.pointsAwarded}</span>
                {confirmDelete === g.id ? (
                  <span className="flex shrink-0 items-center gap-1">
                    <button type="button" disabled={pending} onClick={() => exec(() => deleteMatchGame(g.id), () => setConfirmDelete(null))} className="rounded-md bg-loss px-2 py-1 text-xs font-bold text-white">Delete</button>
                    <button type="button" onClick={() => setConfirmDelete(null)} className="rounded-md px-2 py-1 text-xs text-ink-muted">Keep</button>
                  </span>
                ) : (
                  <span className="flex shrink-0 items-center gap-1">
                    <button
                      type="button" aria-label={`Edit game ${g.gameNumber}`}
                      onClick={() => { setAdding(false); setDraft({ winnerSide: sideOf(g.winnerId), gameType: g.gameType, cubeValue: g.cubeValue }); setEditing(g.id) }}
                      className="rounded-md p-1.5 text-ink-subtle hover:bg-surface-elevated hover:text-ink"
                    >
                      <PencilLine className="h-4 w-4" />
                    </button>
                    <button type="button" aria-label={`Delete game ${g.gameNumber}`} onClick={() => setConfirmDelete(g.id)} className="rounded-md p-1.5 text-ink-subtle hover:bg-loss/10 hover:text-loss">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </span>
                )}
              </div>
            )
          ))}
          {adding && (
            <GameEditor
              label="New game"
              draft={draft} setDraft={setDraft}
              p1={match.player1Name} p2={match.player2Name}
              pending={pending}
              onCancel={() => setAdding(false)}
              onSave={() => exec(() => addMatchGame({ matchId: match.id, ...draft }), () => setAdding(false))}
            />
          )}
        </div>
        {!adding && (
          <button
            type="button"
            onClick={() => { setEditing(null); setDraft({ winnerSide: 1, gameType: 'NORMAL', cubeValue: 1 }); setAdding(true) }}
            className="flex items-center gap-1.5 text-sm font-semibold text-gold hover:underline"
          >
            <Plus className="h-4 w-4" /> Add a missed game
          </button>
        )}
      </section>
    </div>
  )
}

function GameEditor({ label, draft, setDraft, p1, p2, pending, onSave, onCancel }: {
  label: string; draft: Draft; setDraft: (d: Draft) => void
  p1: string; p2: string; pending: boolean
  onSave: () => void; onCancel: () => void
}) {
  const pts = draft.cubeValue * GAME_TYPE_MULTIPLIER[draft.gameType]
  const select = 'rounded-lg border border-line bg-surface-elevated px-2 py-1.5 text-sm text-ink focus:border-gold focus:outline-none'
  return (
    <div className="space-y-3 bg-gold/5 px-4 py-3">
      <p className="text-xs font-semibold text-ink-subtle">{label}</p>
      <div className="grid grid-cols-2 gap-2">
        {([1, 2] as const).map(side => (
          <button
            key={side} type="button"
            onClick={() => setDraft({ ...draft, winnerSide: side })}
            className={cn(
              'truncate rounded-lg border px-3 py-2 text-sm font-semibold transition-colors',
              draft.winnerSide === side ? 'border-gold bg-gold/15 text-gold' : 'border-line bg-surface-raised text-ink-muted',
            )}
          >
            {side === 1 ? p1 : p2} won
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <select aria-label="Result type" className={select} value={draft.gameType} onChange={e => setDraft({ ...draft, gameType: e.target.value as GameType })}>
          {GAME_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <select aria-label="Cube value" className={select} value={draft.cubeValue} onChange={e => setDraft({ ...draft, cubeValue: Number(e.target.value) })}>
          {CUBES.map(c => <option key={c} value={c}>Cube {c}</option>)}
        </select>
        <span className="text-sm font-bold text-gold tabular-nums">= {pts} pt{pts === 1 ? '' : 's'}</span>
        <span className="ml-auto flex gap-1">
          <button type="button" onClick={onCancel} className="rounded-lg px-3 py-1.5 text-sm text-ink-muted hover:text-ink">Cancel</button>
          <button type="button" disabled={pending} onClick={onSave} className="flex items-center gap-1 rounded-lg bg-gold px-3 py-1.5 text-sm font-bold text-surface-canvas disabled:opacity-50">
            <Check className="h-4 w-4" /> Save
          </button>
        </span>
      </div>
    </div>
  )
}
