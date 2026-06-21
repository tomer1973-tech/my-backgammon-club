'use client'

/**
 * MatchCard — interactive match row for the matches list.
 *
 * For ACTIVE / PENDING matches owned by the current user (or admin):
 *  • Active:  Abandon button (with inline confirm)
 *  • Pending: Start Now button + Cancel button
 */

import { useState, useTransition }                                  from 'react'
import Link                                                          from 'next/link'
import { useRouter }                                                 from 'next/navigation'
import { Calendar, Clock, Trophy, Trash2, Play, Check, X, Pencil }  from 'lucide-react'
import { Badge }                                                     from '@/components/ui/badge'
import { OPENING_TYPE_LABEL }                                        from '@/types'
import { cn }                                                        from '@/lib/utils'
import { abandonMatch, cancelScheduledMatch, startScheduledMatch, setMatchScore } from '@/actions/match'
import type { MatchSummary }                                         from '@/types'

interface MatchCardProps {
  match:         MatchSummary
  /** If true, action bar (abandon/cancel/start) is shown. */
  canManage?:    boolean
  /** If true, allow score editing on completed matches (admin only). */
  canEditScore?: boolean
}

const statusVariant = {
  PENDING:   'warning',
  ACTIVE:    'win',
  COMPLETED: 'default',
} as const

export function MatchCard({ match, canManage = false, canEditScore = false }: MatchCardProps) {
  const router = useRouter()
  const [confirming,    setConfirming]    = useState(false)
  const [busy,          startTransition]  = useTransition()
  const [editingScore,  setEditingScore]  = useState(false)
  const [s1, setS1] = useState(String(match.player1Score))
  const [s2, setS2] = useState(String(match.player2Score))
  const [scoreError, setScoreError] = useState('')

  const isActive    = match.status === 'ACTIVE'
  const isPending   = match.status === 'PENDING'
  const isCompleted = match.status === 'COMPLETED'
  const showActions = canManage && !isCompleted

  // Bracket matches: a slot may still be TBD, and we don't allow cancelling
  // individual bracket matches (it would break advancement). Use Regenerate
  // or End tournament instead.
  const isBracket  = match.bracket != null
  const ready      = match.player1Id != null && match.player2Id != null
  const startable  = isPending && ready
  const allowDestructive = !isBracket

  // Swallow clicks so they don't bubble to the card <Link>
  function block(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
  }

  function handleStartNow(e: React.MouseEvent) {
    block(e)
    startTransition(async () => {
      const res = await startScheduledMatch(match.id)
      if (res.success) {
        router.push(`/tournaments/${match.tournamentId}/matches/${match.id}`)
      }
    })
  }

  function handleAskConfirm(e: React.MouseEvent) {
    block(e)
    setConfirming(true)
  }

  function handleCancelConfirm(e: React.MouseEvent) {
    block(e)
    setConfirming(false)
  }

  function handleConfirmedDelete(e: React.MouseEvent) {
    block(e)
    startTransition(async () => {
      const action = isPending ? cancelScheduledMatch : abandonMatch
      await action(match.id)
      setConfirming(false)
      router.refresh()
    })
  }

  function handleSaveScore(e: React.MouseEvent) {
    block(e)
    const n1 = parseInt(s1, 10)
    const n2 = parseInt(s2, 10)
    if (isNaN(n1) || isNaN(n2) || n1 < 0 || n2 < 0) {
      setScoreError('Scores must be non-negative numbers.')
      return
    }
    setScoreError('')
    startTransition(async () => {
      const res = await setMatchScore({ matchId: match.id, player1Score: n1, player2Score: n2 })
      if (res.success) {
        setEditingScore(false)
        router.refresh()
      } else {
        setScoreError(res.error ?? 'Failed to update score.')
      }
    })
  }

  const formattedDate = new Date(match.createdAt).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric',
  })
  const formattedTime = new Date(match.createdAt).toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit',
  })
  const durationMin = match.duration ? Math.round(match.duration / 60) : null

  return (
    <div className={cn(
      'rounded-xl border bg-surface-raised overflow-hidden transition-all',
      isActive ? 'border-win/40 hover:border-win/60' : 'border-line hover:border-gold/30',
    )}>
      {/* ── Card body — links to match detail ────────────────────────── */}
      <Link href={`/tournaments/${match.tournamentId}/matches/${match.id}`} className="block p-4">
        <div className="flex items-start justify-between gap-3">

          {/* Players + score */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={cn(
                'text-sm font-semibold',
                isCompleted && match.winnerName === match.player1Name ? 'text-win' : 'text-ink',
              )}>
                {match.player1Name}
              </span>
              <span className="text-xs text-ink-subtle">vs</span>
              <span className={cn(
                'text-sm font-semibold',
                isCompleted && match.winnerName === match.player2Name ? 'text-win' : 'text-ink',
              )}>
                {match.player2Name}
              </span>
            </div>

            {(isActive || isCompleted) && (
              <p className="mt-1 text-lg font-black font-mono tracking-tight text-gold">
                {match.player1Score} – {match.player2Score}
                <span className="ml-2 text-xs font-normal text-ink-subtle">
                  Race to {match.targetScore}
                </span>
              </p>
            )}

            {isCompleted && match.winnerName && (
              <div className="mt-1 flex items-center gap-1">
                <Trophy className="h-3 w-3 text-win" />
                <span className="text-xs font-medium text-win">{match.winnerName} wins</span>
              </div>
            )}

            {match.openingType && (
              <p className="mt-1 text-xs text-ink-subtle">
                {OPENING_TYPE_LABEL[match.openingType]}
              </p>
            )}
          </div>

          {/* Right-side meta */}
          <div className="flex flex-col items-end gap-2 shrink-0">
            <Badge variant={statusVariant[match.status]}>
              {isActive ? (
                <span className="flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-win animate-pulse" />
                  Live
                </span>
              ) : match.status}
            </Badge>

            <div className="flex items-center gap-1 text-xs text-ink-subtle">
              <Calendar className="h-3 w-3" />
              {formattedDate} · {formattedTime}
            </div>

            {durationMin && (
              <div className="flex items-center gap-1 text-xs text-ink-subtle">
                <Clock className="h-3 w-3" />
                {durationMin}m
              </div>
            )}

            {match.gameCount > 0 && (
              <span className="text-xs text-ink-subtle">
                {match.gameCount} {match.gameCount === 1 ? 'game' : 'games'}
              </span>
            )}
          </div>
        </div>
      </Link>

      {/* ── Admin score editor (completed matches) ────────────────────── */}
      {canEditScore && isCompleted && (
        <div className="border-t border-line/40 bg-surface-base/60 px-4 py-2.5">
          {editingScore ? (
            <div className="flex flex-col gap-2" onClick={block}>
              <div className="flex items-center gap-2">
                <span className="text-xs text-ink-muted w-24 truncate">{match.player1Name}</span>
                <input
                  type="number" min={0} value={s1}
                  onChange={e => setS1(e.target.value)}
                  className="w-14 rounded-lg border border-line bg-surface-elevated px-2 py-1 text-sm font-bold text-ink text-center focus:border-gold/50 focus:outline-none"
                />
                <span className="text-ink-subtle">–</span>
                <input
                  type="number" min={0} value={s2}
                  onChange={e => setS2(e.target.value)}
                  className="w-14 rounded-lg border border-line bg-surface-elevated px-2 py-1 text-sm font-bold text-ink text-center focus:border-gold/50 focus:outline-none"
                />
                <span className="text-xs text-ink-muted w-24 truncate text-right">{match.player2Name}</span>
              </div>
              {scoreError && <p className="text-xs text-loss">{scoreError}</p>}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSaveScore}
                  disabled={busy}
                  className="flex items-center gap-1.5 rounded-lg bg-gold/15 border border-gold/40 text-gold text-xs font-semibold px-3 py-1.5 hover:bg-gold/25 transition-colors disabled:opacity-50"
                >
                  <Check className="h-3.5 w-3.5" />
                  {busy ? 'Saving…' : 'Save score'}
                </button>
                <button
                  onClick={e => { block(e); setEditingScore(false); setScoreError('') }}
                  className="text-xs text-ink-subtle hover:text-ink transition-colors px-2 py-1.5"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={e => { block(e); setS1(String(match.player1Score)); setS2(String(match.player2Score)); setEditingScore(true) }}
              className="flex items-center gap-1.5 text-xs text-ink-subtle hover:text-gold transition-colors"
            >
              <Pencil className="h-3 w-3" />
              Edit score
            </button>
          )}
        </div>
      )}

      {/* ── Action bar (visible for active/pending when canManage) ────── */}
      {showActions && (
        <div className="border-t border-line/40 bg-surface-base/60 px-4 py-2.5 flex items-center justify-between gap-2">
          <span className="text-xs text-ink-subtle">
            {isActive
              ? 'Match in progress'
              : isPending && !ready
                ? 'Waiting for both players'
                : 'Scheduled match'}
          </span>

          <div className="flex items-center gap-2">
            {/* Start now — only for PENDING matches that have both players */}
            {startable && (
              <button
                onClick={handleStartNow}
                disabled={busy}
                className="flex items-center gap-1.5 rounded-lg bg-win/10 border border-win/30
                  text-win text-xs font-semibold px-3 py-1.5
                  hover:bg-win/20 transition-colors disabled:opacity-50"
              >
                <Play className="h-3.5 w-3.5" />
                Start now
              </button>
            )}

            {/* Abandon / Cancel with inline confirm — hidden for bracket matches */}
            {!allowDestructive ? null : confirming ? (
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-medium text-loss">
                  {isActive ? 'Abandon?' : 'Cancel?'}
                </span>
                <button
                  onClick={handleConfirmedDelete}
                  disabled={busy}
                  className="flex items-center gap-1 rounded-lg bg-loss/10 border border-loss/40
                    text-loss text-xs font-bold px-2.5 py-1
                    hover:bg-loss/20 transition-colors disabled:opacity-50"
                >
                  <Check className="h-3 w-3" />
                  {busy ? '…' : 'Yes, remove'}
                </button>
                <button
                  onClick={handleCancelConfirm}
                  className="rounded-lg border border-line text-ink-muted text-xs px-2 py-1
                    hover:border-gold/30 transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <button
                onClick={handleAskConfirm}
                disabled={busy}
                className="flex items-center gap-1.5 rounded-lg border border-loss/30
                  text-loss/80 text-xs font-medium px-3 py-1.5
                  hover:bg-loss/10 hover:border-loss/50 hover:text-loss
                  transition-colors disabled:opacity-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
                {isActive ? 'Abandon' : 'Cancel'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
