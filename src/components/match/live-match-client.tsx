'use client'

/**
 * LiveMatchClient — online real-time backgammon for a Match.
 *
 * Two players each see the board from their own color's perspective and play
 * moves through server actions backed by the `LiveGame` row. After every
 * mutation the resulting state is broadcast over a Supabase Realtime channel
 * (`live-game-{id}`) so the other player's board updates instantly without a
 * page reload. The `LiveGame` row remains the source of truth for reloads
 * and reconnects.
 */

import { useEffect, useRef, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Undo2, Trophy, Wifi, WifiOff, X } from 'lucide-react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Dialog, DialogFooter } from '@/components/ui/dialog'
import { BackgammonBoard } from '@/components/backgammon'
import { useBoardThemes, BoardCustomizeButton } from '@/components/backgammon/board-customizer'
import { cn } from '@/lib/utils'
import {
  applyLiveMove, endLiveTurn, undoLiveMove, offerLiveDouble, respondLiveDouble,
  getOrCreateLiveGame, type LiveGameData,
} from '@/actions/live-game'
import {
  getLegalSequences, isSequencePrefix, opponent,
  type Player, type Move, type GameType,
} from '@/lib/backgammon'
import type { Match } from '@/types'

const GAME_TYPE_LABEL: Record<GameType, string> = {
  NORMAL: 'Normal', GAMMON: 'Gammon', BACKGAMMON: 'Backgammon',
}
const GAME_TYPE_POINTS: Record<GameType, number> = { NORMAL: 1, GAMMON: 2, BACKGAMMON: 3 }

interface LiveMatchClientProps {
  match:           Match
  initialLiveGame: LiveGameData
  myColor:         Player | null
}

/** True once `movesPlayed` is a maximal sequence (no further moves possible). */
function nextMovesEmpty(legalSequences: { moves: Move[] }[], movesPlayed: Move[]): boolean {
  for (const seq of legalSequences) {
    if (seq.moves.length <= movesPlayed.length) continue
    if (isSequencePrefix(movesPlayed, seq.moves)) return false
  }
  return true
}

export function LiveMatchClient({ match, initialLiveGame, myColor }: LiveMatchClientProps) {
  const [game, setGame]   = useState(initialLiveGame)
  const [error, setError] = useState<string | null>(null)
  const [connected, setConnected] = useState(false)
  const [pending, startTransition] = useTransition()

  const { boardThemeId, diceThemeId, boardTheme, diceTheme, chooseBoardTheme, chooseDiceTheme } = useBoardThemes()

  const channelRef = useRef<RealtimeChannel | null>(null)

  // ── Realtime sync ─────────────────────────────────────────────────────────
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase.channel(`live-game-${game.id}`, { config: { broadcast: { self: false } } })
      .on('broadcast', { event: 'update' }, ({ payload }) => {
        setGame(payload as LiveGameData)
      })
      .subscribe(status => setConnected(status === 'SUBSCRIBED'))

    channelRef.current = channel
    return () => { supabase.removeChannel(channel) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.id])

  function broadcast(next: LiveGameData) {
    channelRef.current?.send({ type: 'broadcast', event: 'update', payload: next })
  }

  function applyResult(res: { success: true; data: LiveGameData } | { success: false; error: string }) {
    if (res.success) {
      setGame(res.data)
      setError(null)
      broadcast(res.data)
    } else {
      setError(res.error)
    }
  }

  // ── Derived state ────────────────────────────────────────────────────────
  const whiteName = game.player1Color === 'white' ? match.player1Name : match.player2Name
  const blackName = game.player1Color === 'white' ? match.player2Name : match.player1Name

  const legalSequences = game.status === 'PLAYING' && game.dice
    ? getLegalSequences(game.board, game.currentPlayer, game.dice)
    : []
  const noLegalMoves = game.dice !== null && legalSequences.length === 1 && legalSequences[0].moves.length === 0
  const turnDone = game.dice !== null && !noLegalMoves && nextMovesEmpty(legalSequences, game.movesPlayed)

  const isMyTurn = game.status === 'PLAYING' && !game.doubleOffer
    && myColor !== null && myColor === game.currentPlayer

  // ── Action handlers ──────────────────────────────────────────────────────
  function handleMove(move: Move) {
    startTransition(async () => applyResult(await applyLiveMove(game.id, move)))
  }
  function handleUndo() {
    startTransition(async () => applyResult(await undoLiveMove(game.id)))
  }
  function handleEndTurn() {
    startTransition(async () => applyResult(await endLiveTurn(game.id)))
  }
  function handleOfferDouble() {
    startTransition(async () => applyResult(await offerLiveDouble(game.id)))
  }
  function handleRespondDouble(accept: boolean) {
    startTransition(async () => applyResult(await respondLiveDouble(game.id, accept)))
  }
  function handleNextGame() {
    startTransition(async () => {
      const res = await getOrCreateLiveGame(match.id)
      if (res.success) {
        setGame(res.data.liveGame)
        broadcast(res.data.liveGame)
      } else {
        setError(res.error)
      }
    })
  }

  // ── Game over ────────────────────────────────────────────────────────────
  if (game.status === 'FINISHED' && game.winner) {
    const youWon = myColor === game.winner
    const gameType = match.games.find(g => g.gameNumber === game.gameNumber)?.gameType ?? 'NORMAL'
    const points = GAME_TYPE_POINTS[gameType] * game.cubeValue
    const winnerName = game.winner === 'white' ? whiteName : blackName

    return (
      <FullscreenMatchShell match={match}>
        <BackLink match={match} />
        <div className={cn(
          'rounded-2xl border p-8 text-center space-y-3',
          youWon ? 'border-win/40 bg-win/5' : 'border-loss/40 bg-loss/5',
        )}>
          <Trophy className={cn('mx-auto h-12 w-12', youWon ? 'text-win' : 'text-loss')} />
          <div>
            <p className="text-xs uppercase tracking-widest text-ink-subtle mb-1">
              {myColor ? (youWon ? 'You win!' : 'You lose') : 'Game over'}
            </p>
            <h2 className={cn('text-3xl font-black', youWon ? 'text-win' : 'text-loss')}>
              {winnerName}
            </h2>
            <p className="mt-2 text-sm text-ink-muted">
              {GAME_TYPE_LABEL[gameType]}
              {game.cubeValue > 1 && ` · cube at ${game.cubeValue}`}
              {' · '}{points} point{points === 1 ? '' : 's'}
            </p>
          </div>
        </div>

        {match.status === 'ACTIVE' ? (
          <Button onClick={handleNextGame} disabled={pending} size="lg" className="w-full">
            {pending ? 'Starting…' : 'Start next game'}
          </Button>
        ) : (
          <Link href={`/tournaments/${match.tournamentId}/matches/${match.id}`}>
            <Button size="lg" className="w-full">View match result</Button>
          </Link>
        )}
      </FullscreenMatchShell>
    )
  }

  return (
    <FullscreenMatchShell match={match} connected={connected}>
      <div className="flex items-center justify-between gap-2">
        <BackLink match={match} connected={connected} />
        <BoardCustomizeButton
          boardThemeId={boardThemeId}
          diceThemeId={diceThemeId}
          onBoard={chooseBoardTheme}
          onDice={chooseDiceTheme}
        />
      </div>

      {/* Players + turn banner */}
      <div className="rounded-xl border border-line bg-surface-raised px-4 py-3">
        <div className="flex items-center justify-between text-sm">
          <PlayerTag name={blackName} color="black" active={game.currentPlayer === 'black'} mine={myColor === 'black'} />
          <span className="text-xs uppercase tracking-widest text-ink-subtle">vs</span>
          <PlayerTag name={whiteName} color="white" active={game.currentPlayer === 'white'} mine={myColor === 'white'} />
        </div>
        <p className="mt-2 text-center text-sm font-semibold text-ink">
          {myColor === null
            ? `${game.currentPlayer === 'white' ? whiteName : blackName} to move (spectating)`
            : isMyTurn
              ? 'Your move'
              : game.doubleOffer
                ? 'Double offered'
                : `Waiting for ${game.currentPlayer === 'white' ? whiteName : blackName}…`}
        </p>
        {noLegalMoves && isMyTurn && (
          <p className="mt-1 text-center text-xs font-medium text-loss">No legal moves — pass the turn</p>
        )}
      </div>

      <BackgammonBoard
        board={game.board}
        perspective={myColor ?? game.player1Color}
        toMove={isMyTurn && !turnDone && !noLegalMoves ? myColor : null}
        dice={game.dice}
        legalSequences={legalSequences}
        movesPlayed={game.movesPlayed}
        onMove={handleMove}
        cube={{ value: game.cubeValue, owner: game.cubeOwner }}
        disabled={!isMyTurn || pending}
        boardTheme={boardTheme}
        diceTheme={diceTheme}
      />

      {error && (
        <p className="rounded-lg border border-loss/30 bg-loss/5 px-3 py-2 text-center text-xs font-medium text-loss">
          {error}
        </p>
      )}

      {/* Controls */}
      {myColor !== null && game.status === 'PLAYING' && !game.doubleOffer && (
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={handleUndo}
            variant="secondary"
            disabled={!isMyTurn || pending || game.movesPlayed.length === 0}
            className="gap-2"
          >
            <Undo2 className="h-4 w-4" />
            Undo
          </Button>

          {isMyTurn && (game.cubeOwner === null || game.cubeOwner === myColor)
            && game.movesPlayed.length === 0 && game.cubeValue < 64 && (
            <Button onClick={handleOfferDouble} variant="secondary" disabled={pending} className="gap-2">
              Double ({game.cubeValue} → {game.cubeValue * 2})
            </Button>
          )}

          <Button
            onClick={handleEndTurn}
            disabled={!isMyTurn || pending || (!turnDone && !noLegalMoves)}
            className="ml-auto gap-2"
          >
            End turn
            <ChevronLeft className="h-4 w-4 rotate-180" />
          </Button>
        </div>
      )}

      {/* Double offer dialog */}
      <Dialog
        open={!!game.doubleOffer}
        onClose={() => {}}
        title="Double offered"
      >
        {game.doubleOffer && myColor === opponent(game.doubleOffer) ? (
          <>
            <p className="text-sm text-ink-muted">
              {game.doubleOffer === 'white' ? whiteName : blackName} offers to double the stakes to{' '}
              <span className="font-bold text-gold">{game.cubeValue * 2}</span>.
            </p>
            <DialogFooter>
              <Button variant="secondary" onClick={() => handleRespondDouble(false)} disabled={pending}>
                Decline
              </Button>
              <Button onClick={() => handleRespondDouble(true)} disabled={pending}>
                Accept
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <p className="text-sm text-ink-muted">
              You offered to double to <span className="font-bold text-gold">{game.cubeValue * 2}</span>.{' '}
              Waiting for {game.doubleOffer === 'white' ? blackName : whiteName}…
            </p>
            <DialogFooter>
              <span />
            </DialogFooter>
          </>
        )}
      </Dialog>
    </FullscreenMatchShell>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * FullscreenMatchShell — on mobile, takes over the whole viewport (above the
 * app's top bar and bottom nav) so the board gets maximum space and feels
 * like a real game screen rather than a page in a list of pages. Desktop is
 * unaffected — the match just renders inline as before.
 */
function FullscreenMatchShell({
  match, connected, children,
}: { match: Match; connected?: boolean; children: React.ReactNode }) {
  const router = useRouter()

  function close() {
    router.push(`/tournaments/${match.tournamentId}/matches/${match.id}`)
  }

  return (
    <div className="fixed inset-0 z-[45] flex flex-col overflow-y-auto bg-surface-base px-4 pb-4 pt-[max(0.75rem,env(safe-area-inset-top))] md:static md:inset-auto md:z-auto md:flex-none md:overflow-visible md:px-0 md:pb-0 md:pt-0">
      {/* Mobile-only close bar — replaces the app's hidden top bar / bottom nav while in-game */}
      <div className="mb-3 flex items-center justify-between gap-2 md:hidden">
        {connected !== undefined ? (
          <span className={cn(
            'inline-flex items-center gap-1.5 text-xs font-medium',
            connected ? 'text-win' : 'text-ink-subtle',
          )}>
            {connected ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
            {connected ? 'Live' : 'Connecting…'}
          </span>
        ) : <span />}
        <button
          onClick={close}
          className="flex items-center gap-1.5 rounded-full border border-line bg-surface-raised px-3 py-1.5 text-xs font-medium text-ink-muted transition-colors hover:text-ink"
        >
          <X className="h-3.5 w-3.5" />
          Close
        </button>
      </div>

      <div className="flex flex-col gap-4 animate-fade-in">
        {children}
      </div>
    </div>
  )
}

function BackLink({ match, connected }: { match: Match; connected?: boolean }) {
  return (
    <div className="hidden items-center justify-between md:flex">
      <Link
        href={`/tournaments/${match.tournamentId}/matches/${match.id}`}
        className="inline-flex items-center gap-1 text-sm text-ink-muted hover:text-ink transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
        Match
      </Link>
      {connected !== undefined && (
        <span className={cn(
          'inline-flex items-center gap-1.5 text-xs font-medium',
          connected ? 'text-win' : 'text-ink-subtle',
        )}>
          {connected ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
          {connected ? 'Live' : 'Connecting…'}
        </span>
      )}
    </div>
  )
}

function PlayerTag({ name, color, active, mine }: { name: string; color: Player; active: boolean; mine: boolean }) {
  return (
    <span className={cn(
      'inline-flex items-center gap-2 rounded-full px-3 py-1 transition-colors',
      active ? 'bg-gold/10 text-gold border border-gold/20' : 'text-ink-muted',
    )}>
      <span className={cn(
        'h-3 w-3 rounded-full border-2',
        color === 'white'
          ? 'bg-[hsl(40,35%,94%)] border-[hsl(40,20%,75%)]'
          : 'bg-[hsl(25,20%,14%)] border-gold/60',
      )} />
      <span className="font-medium">{name}{mine && ' (You)'}</span>
    </span>
  )
}
