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

import { useState }                    from 'react'
import Link                            from 'next/link'
import { ChevronLeft, Clock }          from 'lucide-react'
import { ScoreBoard }                  from './score-board'
import { DoublingCube }                from './doubling-cube'
import { RecordGamePanel }             from './record-game-panel'
import { GameLog }                     from './game-log'
import { DoubleDialog }                from './double-dialog'
import { MatchCompleteDialog }         from './match-complete-dialog'
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

  // ── Handlers ──────────────────────────────────────────────────────────────

  function handleOfferDouble(offeringPlayerId: string) {
    const isP1      = offeringPlayerId === match.player1Id
    setDoubleOffer({
      offererId:    offeringPlayerId,
      acceptorId:   isP1 ? match.player2Id : match.player1Id,
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
  const startedAt  = match.startedAt ? new Date(match.startedAt) : null
  const durationMs = startedAt ? Date.now() - startedAt.getTime() : 0
  const durationMin = Math.floor(durationMs / 60000)

  return (
    <div className="flex flex-col gap-5 animate-fade-in">
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
        </div>
      </div>

      {/* Score board */}
      <ScoreBoard
        player1Name={match.player1Name}
        player2Name={match.player2Name}
        player1Score={match.player1Score}
        player2Score={match.player2Score}
        targetScore={match.targetScore}
        winnerId={match.winnerId}
        player1Id={match.player1Id}
        player2Id={match.player2Id}
      />

      {/* Doubling cube — only show during active match */}
      {isActive && (
        <div className="rounded-xl border border-line bg-surface-raised p-5">
          <h3 className="mb-4 text-center text-xs font-semibold uppercase tracking-wider text-ink-subtle">
            Doubling Cube
          </h3>
          <DoublingCube
            cubeValue={match.cubeValue}
            cubeOwnerId={match.cubeOwnerId}
            player1Id={match.player1Id}
            player2Id={match.player2Id}
            player1Name={match.player1Name}
            player2Name={match.player2Name}
            onOfferDouble={handleOfferDouble}
            disabled={isOver}
          />
        </div>
      )}

      {/* Record game panel — only during active match */}
      {isActive && (
        <RecordGamePanel
          matchId={match.id}
          player1Id={match.player1Id}
          player2Id={match.player2Id}
          player1Name={match.player1Name}
          player2Name={match.player2Name}
          cubeValue={match.cubeValue}
          onGameRecorded={handleGameRecorded}
        />
      )}

      {/* Game log */}
      <GameLog
        games={match.games}
        player1Id={match.player1Id}
        player2Id={match.player2Id}
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
