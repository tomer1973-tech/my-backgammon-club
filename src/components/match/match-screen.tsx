'use client'

/**
 * MatchScreen — the full live match interface.
 *
 * Layout (focused, vertical):
 *   ┌─────────────────────────────────┐
 *   │ Score board (scores + progress) │
 *   │                                 │
 *   │ Doubling cube (center)          │
 *   │                                 │
 *   │ Record game panel               │
 *   │                                 │
 *   │ Game log (collapsible)          │
 *   └─────────────────────────────────┘
 *
 * State is initialized from the server-fetched match, then updated locally
 * after each server action without a full page refresh.
 */

import { useState, useTransition, useEffect } from 'react'
import Link                            from 'next/link'
import { useRouter }                   from 'next/navigation'
import { ChevronLeft, Clock, Trash2, Dices, Pencil } from 'lucide-react'
import { abandonMatch, cancelScheduledMatch } from '@/actions/match'
import { Button }                      from '@/components/ui/button'
import { ScoreBoard }                  from './score-board'
import { DoublingCube }                from './doubling-cube'
import { RecordGamePanel }             from './record-game-panel'
import { GameLog }                     from './game-log'
import { DoubleDialog }                from './double-dialog'
import { MatchCompleteDialog }         from './match-complete-dialog'
import { RematchButton }               from './rematch-button'
import { EditMatchDialog }             from './edit-match-dialog'
import { LikeButton }                  from '@/components/social/like-button'
import { ShareButton }                 from '@/components/social/share-button'
import type { Match, MatchGame, MatchStatus, OpeningType } from '@/types'

interface LikeData {
  count:     number
  likedByMe: boolean
}

interface MatchScreenProps {
  initialMatch:    Match
  initialLikeData?: LikeData
}

export function MatchScreen({ initialMatch, initialLikeData }: MatchScreenProps) {
  // Local state — mirrors DB, updated optimistically after each action
  const [match, setMatch] = useState(initialMatch)

  // Double offer dialog state
  const [doubleOffer, setDoubleOffer] = useState<{
    offererId:   string
    acceptorId:  string
    offererName: string
    acceptorName: string
  } | null>(null)

  // Match complete dialog
  const [showComplete, setShowComplete] = useState(false)

  const isOver    = match.status === 'COMPLETED'
  const isActive  = match.status === 'ACTIVE'
  const isPending = match.status === 'PENDING'

  const router = useRouter()
  const [abandonPending, startAbandonTransition] = useTransition()
  const [confirmAbandon, setConfirmAbandon]      = useState(false)
  const [editingMatch, setEditingMatch]          = useState(false)

  function handleAbandon() {
    startAbandonTransition(async () => {
      const action = isPending ? cancelScheduledMatch : abandonMatch
      const res = await action(match.id)
      if (res.success) router.push(`/tournaments/${match.tournamentId}/matches`)
    })
  }

  // ── Handlers ──────────────────────────────────────────────────────────────

  function handleOfferDouble(offeringPlayerId: string) {
    const isP1      = offeringPlayerId === match.player1Id
    setDoubleOffer({
      offererId:    offeringPlayerId,
      acceptorId:   (isP1 ? match.player2Id : match.player1Id)!,
      offererName:  isP1 ? match.player1Name : match.player2Name,
      acceptorName: isP1 ? match.player2Name : match.player1Name,
    })
  }

  function handleDoubleResolved(
    accepted: boolean,
    matchComplete?: boolean,
    winnerId?: string | null,
  ) {
    if (accepted) {
      // Cube flipped — update local state (DB already updated by server action)
      setMatch(prev => ({
        ...prev,
        cubeValue:   prev.cubeValue * 2,
        cubeOwnerId: doubleOffer?.acceptorId ?? null,
      }))
    } else {
      // Declined — a normal game was recorded; fetch or update
      if (matchComplete) {
        setMatch(prev => ({
          ...prev,
          status:       'COMPLETED' as MatchStatus,
          winnerId:     winnerId ?? null,
          winnerName:   winnerId === prev.player1Id ? prev.player1Name : prev.player2Name,
          cubeValue:    1,
          cubeOwnerId:  null,
        }))
        setShowComplete(true)
      } else {
        // Score updated by decline — refetch via page refresh is simplest
        window.location.reload()
      }
    }
    setDoubleOffer(null)
  }

  function handleGameRecorded(complete: boolean, winnerId?: string | null) {
    // After a game, cube always resets to center
    setMatch(prev => ({
      ...prev,
      cubeValue:   1,
      cubeOwnerId: null,
    }))
    if (complete) {
      setMatch(prev => ({
        ...prev,
        status:    'COMPLETED' as MatchStatus,
        winnerId:  winnerId ?? null,
        winnerName: winnerId === prev.player1Id ? prev.player1Name : prev.player2Name,
      }))
      setShowComplete(true)
    }
    // Optimistically refresh game list from server
    window.location.reload()
  }

  // ── Duration display ───────────────────────────────────────────────────────
  const startedAt   = match.startedAt ? new Date(match.startedAt) : null
  const [nowMs, setNowMs] = useState<number>(0)

  useEffect(() => {
    // Only start the clock on the client (avoids SSR mismatch)
    setNowMs(Date.now())
    if (!isActive || !startedAt) return
    const interval = setInterval(() => setNowMs(Date.now()), 60_000)
    return () => clearInterval(interval)
  }, [isActive, startedAt])

  const durationMin = startedAt && nowMs > 0
    ? Math.floor((nowMs - startedAt.getTime()) / 60000)
    : 0

  // Bracket slot that hasn't received both players yet — nothing to play.
  if (!isOver && (!match.player1Id || !match.player2Id)) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-line bg-surface-raised py-16 text-center animate-fade-in">
        <p className="text-base font-semibold text-ink">Waiting for both players</p>
        <p className="max-w-sm text-sm text-ink-muted">
          This bracket match will be ready once the feeding matches finish and their winners
          advance here.
        </p>
        <Link
          href={`/tournaments/${match.tournamentId}/matches`}
          className="text-sm font-medium text-gold hover:underline"
        >
          ← Back to matches
        </Link>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3 animate-fade-in w-full max-w-xl mx-auto [@media(max-height:500px)]:max-w-none">
      {/* Back + match meta */}
      <div className="flex items-center justify-between">
        <Link
          href={`/tournaments/${match.tournamentId}/matches`}
          className="inline-flex items-center gap-1 text-sm text-ink-muted hover:text-ink transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          Matches
        </Link>
        <div className="flex items-center gap-2 text-xs text-ink-subtle">
          {isActive && startedAt && (
            <>
              <Clock className="h-3.5 w-3.5" />
              <span>{durationMin}m</span>
            </>
          )}
          {isOver && <span className="text-gold font-medium">Completed</span>}

          {/* Edit match — race length + guest renames, while not completed */}
          {!isOver && !confirmAbandon && (
            <button
              onClick={() => setEditingMatch(true)}
              className="flex items-center gap-1 rounded-lg border border-line text-ink-subtle text-xs px-2 py-1 hover:border-gold/40 hover:text-gold transition-colors"
            >
              <Pencil className="h-3 w-3" />
              Edit
            </button>
          )}

          {/* Abandon / Cancel button for non-completed matches */}
          {!isOver && (
            confirmAbandon ? (
              <div className="flex items-center gap-1.5">
                <span className="text-loss text-xs font-medium">
                  {isPending ? 'Cancel this match?' : 'Abandon match?'}
                </span>
                <button
                  onClick={handleAbandon}
                  disabled={abandonPending}
                  className="rounded-lg bg-loss/10 border border-loss/30 text-loss text-xs font-semibold px-2 py-1 hover:bg-loss/20 transition-colors disabled:opacity-50"
                >
                  {abandonPending ? '…' : 'Yes, remove it'}
                </button>
                <button
                  onClick={() => setConfirmAbandon(false)}
                  className="rounded-lg border border-line text-ink-muted text-xs px-2 py-1 hover:border-gold/30 transition-colors"
                >
                  No
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmAbandon(true)}
                className="flex items-center gap-1 rounded-lg border border-line text-ink-subtle text-xs px-2 py-1 hover:border-loss/40 hover:text-loss transition-colors"
              >
                <Trash2 className="h-3 w-3" />
                {isPending ? 'Cancel' : 'Abandon'}
              </button>
            )
          )}
        </div>
      </div>

      {/* Landscape (short viewport): score + cube form a left column, the
          record-game panel takes the right column, so nothing requires
          scrolling on a sideways phone. Portrait/desktop: simple stack. */}
      <div className="flex flex-col gap-3 [@media(max-height:500px)]:flex-row [@media(max-height:500px)]:items-start [@media(max-height:500px)]:gap-4">
        <div className="flex flex-col gap-3 [@media(max-height:500px)]:w-[300px] [@media(max-height:500px)]:shrink-0">
          {/* Score board */}
          <ScoreBoard
            player1Name={match.player1Name}
            player2Name={match.player2Name}
            player1Score={match.player1Score}
            player2Score={match.player2Score}
            targetScore={match.targetScore}
            winnerId={match.winnerId}
            player1Id={match.player1Id!}
            player2Id={match.player2Id!}
          />

          {/* Play Live — online board for active matches */}
          {isActive && (
            <Link href={`/tournaments/${match.tournamentId}/matches/${match.id}/live`}>
              <Button className="w-full gap-2">
                <Dices className="h-4 w-4" />
                Play Live
              </Button>
            </Link>
          )}

          {/* Doubling cube — only show during active match */}
          {isActive && (
            <div className="rounded-xl border border-line bg-surface-raised p-4">
              <h3 className="mb-3 text-center text-xs font-semibold uppercase tracking-wider text-ink-subtle">
                Doubling Cube
              </h3>
              <DoublingCube
                cubeValue={match.cubeValue}
                cubeOwnerId={match.cubeOwnerId}
                player1Id={match.player1Id!}
                player2Id={match.player2Id!}
                player1Name={match.player1Name}
                player2Name={match.player2Name}
                onOfferDouble={handleOfferDouble}
                disabled={isOver}
              />
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3 flex-1 min-w-0">
          {/* Record game panel — only during active match */}
          {isActive && (
            <RecordGamePanel
              matchId={match.id}
              player1Id={match.player1Id!}
              player2Id={match.player2Id!}
              player1Name={match.player1Name}
              player2Name={match.player2Name}
              cubeValue={match.cubeValue}
              onGameRecorded={handleGameRecorded}
            />
          )}
        </div>
      </div>

      {/* Game log */}
      <GameLog
        games={match.games}
        player1Id={match.player1Id!}
        player2Id={match.player2Id!}
        player1Name={match.player1Name}
        player2Name={match.player2Name}
        matchComplete={isOver}
        matchId={match.id}
      />

      {/* Opening type section for completed matches */}
      {isOver && match.openingType && (
        <div className="rounded-xl border border-line bg-surface-raised px-5 py-4">
          <p className="text-xs text-ink-subtle">Opening style</p>
          <p className="mt-0.5 text-sm font-medium text-ink">{match.openingType.replace(/_/g, ' ')}</p>
        </div>
      )}

      {/* Social bar — like + share for completed matches */}
      {isOver && (
        <div className="flex items-center gap-3 rounded-xl border border-line bg-surface-raised px-5 py-4">
          <LikeButton
            matchId={match.id}
            initialLiked={initialLikeData?.likedByMe ?? false}
            initialCount={initialLikeData?.count ?? 0}
          />
          <ShareButton
            matchId={match.id}
            player1Name={match.player1Name}
            player2Name={match.player2Name}
            player1Score={match.player1Score}
            player2Score={match.player2Score}
            winnerName={match.winnerName ?? match.player1Name}
            tournamentName={match.tournamentName}
          />
        </div>
      )}

      {/* Rematch — same two players, pick a fresh race-to length */}
      {isOver && match.player1Id && match.player2Id && (
        <RematchButton
          matchId={match.id}
          tournamentId={match.tournamentId}
          defaultTargetScore={match.targetScore}
        />
      )}

      {/* Dialogs */}
      {doubleOffer && (
        <DoubleDialog
          open={!!doubleOffer}
          matchId={match.id}
          offererId={doubleOffer.offererId}
          acceptorId={doubleOffer.acceptorId}
          offererName={doubleOffer.offererName}
          acceptorName={doubleOffer.acceptorName}
          currentCubeValue={match.cubeValue}
          onClose={() => setDoubleOffer(null)}
          onResolved={handleDoubleResolved}
        />
      )}

      {!isOver && match.player1Id && match.player2Id && (
        <EditMatchDialog
          open={editingMatch}
          onClose={() => setEditingMatch(false)}
          matchId={match.id}
          targetScore={match.targetScore}
          player1Id={match.player1Id}
          player2Id={match.player2Id}
          player1Name={match.player1Name}
          player2Name={match.player2Name}
          player1IsGuest={match.player1IsGuest}
          player2IsGuest={match.player2IsGuest}
          onSaved={next => setMatch(prev => ({ ...prev, ...next }))}
        />
      )}

      <MatchCompleteDialog
        open={showComplete}
        matchId={match.id}
        winnerName={match.winnerName ?? ''}
        loserName={match.winnerId === match.player1Id ? match.player2Name : match.player1Name}
        player1Score={match.player1Score}
        player2Score={match.player2Score}
        targetScore={match.targetScore}
        onClose={() => setShowComplete(false)}
      />
    </div>
  )
}
