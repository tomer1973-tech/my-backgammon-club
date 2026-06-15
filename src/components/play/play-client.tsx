'use client'

/**
 * PlayClient — local hot-seat backgammon.
 *
 * Two players share one device, passing it back and forth. The board flips
 * each turn so the player on roll always sees their home board bottom-right.
 */

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ChevronLeft, UserCircle2, Dices, Undo2, RotateCcw, Trophy } from 'lucide-react'
import { Avatar }  from '@/components/ui/avatar'
import { Button }  from '@/components/ui/button'
import { Dialog, DialogFooter } from '@/components/ui/dialog'
import { BackgammonBoard } from '@/components/backgammon'
import { useBoardThemes, BoardCustomizeButton } from '@/components/backgammon/board-customizer'
import { cn } from '@/lib/utils'
import type { SessionUser } from '@/types'
import {
  createInitialBoard, opponent, applyMove, getLegalSequences,
  isGameOver, getGameType, rollDice,
  type Board, type Player, type Dice, type Move, type MoveSequence, type GameType, type CubeState,
} from '@/lib/backgammon'

type Phase = 'setup' | 'playing' | 'gameover'

const GAME_TYPE_LABEL: Record<GameType, string> = {
  NORMAL: 'Normal', GAMMON: 'Gammon', BACKGAMMON: 'Backgammon',
}
const GAME_TYPE_POINTS: Record<GameType, number> = { NORMAL: 1, GAMMON: 2, BACKGAMMON: 3 }

interface GameState {
  boardHistory:   Board[]   // [0] = board at start of turn, last = live board
  currentPlayer:  Player
  dice:           Dice | null
  legalSequences: MoveSequence[]
  movesPlayed:    Move[]
  cube:           CubeState
  doubleOffer:    Player | null  // player who just doubled, awaiting opponent response
}

function rollOpening(): { player: Player; dice: Dice } {
  let dice: Dice
  do { dice = rollDice() } while (dice[0] === dice[1])
  return { player: dice[0] > dice[1] ? 'white' : 'black', dice }
}

function freshGame(): GameState {
  const board = createInitialBoard()
  const { player, dice } = rollOpening()
  return {
    boardHistory:   [board],
    currentPlayer:  player,
    dice,
    legalSequences: getLegalSequences(board, player, dice),
    movesPlayed:    [],
    cube:           { value: 1, owner: null },
    doubleOffer:    null,
  }
}

export function PlayClient({ currentUser }: { currentUser: SessionUser | null }) {
  const [phase, setPhase] = useState<Phase>('setup')
  const [names, setNames] = useState<Record<Player, string>>({ white: 'Player 1', black: 'Player 2' })
  const [game,  setGame]  = useState<GameState | null>(null)
  const [result, setResult] = useState<{ winner: Player; type: GameType } | null>(null)

  const { boardThemeId, diceThemeId, boardTheme, diceTheme, chooseBoardTheme, chooseDiceTheme } = useBoardThemes()

  function startGame() {
    setGame(freshGame())
    setResult(null)
    setPhase('playing')
  }

  // ── Auto-pass when the player on roll has no legal moves ──────────────────
  useEffect(() => {
    if (phase !== 'playing' || !game || game.doubleOffer) return
    const noMoves = game.dice !== null
      && game.legalSequences.length === 1
      && game.legalSequences[0].moves.length === 0
    if (!noMoves) return

    const timer = setTimeout(() => {
      setGame(g => {
        if (!g) return g
        const board = g.boardHistory[g.boardHistory.length - 1]
        const next  = opponent(g.currentPlayer)
        const dice  = rollDice()
        return {
          boardHistory:   [board],
          currentPlayer:  next,
          dice,
          legalSequences: getLegalSequences(board, next, dice),
          movesPlayed:    [],
          cube:           g.cube,
          doubleOffer:    null,
        }
      })
    }, 1500)

    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, game?.currentPlayer, game?.dice, game?.legalSequences])

  if (phase === 'setup') {
    return (
      <div className="animate-fade-in">
        <TopBar currentUser={currentUser} />
        <PageHeader title="Local Play" subtitle="Two players, one device — pass and play" />

        <div className="space-y-4">
          <div className="rounded-2xl border border-line bg-surface-raised p-5 space-y-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-subtle">Players</p>
            <NameField
              label="White"
              value={names.white}
              onChange={v => setNames(n => ({ ...n, white: v }))}
              swatchClass="bg-[hsl(40,35%,94%)] border-[hsl(40,20%,75%)]"
            />
            <NameField
              label="Black"
              value={names.black}
              onChange={v => setNames(n => ({ ...n, black: v }))}
              swatchClass="bg-[hsl(25,20%,14%)] border-gold/60"
            />
          </div>

          <Button onClick={startGame} size="lg" className="w-full gap-2">
            <Dices className="h-5 w-5" />
            Start game
          </Button>
        </div>
      </div>
    )
  }

  if (!game) return null

  const liveBoard = game.boardHistory[game.boardHistory.length - 1]
  const noLegalMoves = game.dice !== null
    && game.legalSequences.length === 1
    && game.legalSequences[0].moves.length === 0
  const turnDone = game.dice !== null && !noLegalMoves
    && nextMovesEmpty(game.legalSequences, game.movesPlayed)

  function handleMove(move: Move) {
    if (!game) return
    const newBoard = applyMove(liveBoard, game.currentPlayer, move)
    const winner = isGameOver(newBoard)
    const newHistory = [...game.boardHistory, newBoard]
    const newMoves = [...game.movesPlayed, move]

    if (winner) {
      setResult({ winner, type: getGameType(newBoard, winner) })
      setGame({ ...game, boardHistory: newHistory, movesPlayed: newMoves })
      setPhase('gameover')
      return
    }

    setGame({ ...game, boardHistory: newHistory, movesPlayed: newMoves })
  }

  function undo() {
    if (!game || game.movesPlayed.length === 0) return
    setGame({
      ...game,
      boardHistory: game.boardHistory.slice(0, -1),
      movesPlayed:  game.movesPlayed.slice(0, -1),
    })
  }

  function endTurn() {
    if (!game) return
    const board = liveBoard
    const next  = opponent(game.currentPlayer)
    const dice  = rollDice()
    setGame({
      boardHistory:   [board],
      currentPlayer:  next,
      dice,
      legalSequences: getLegalSequences(board, next, dice),
      movesPlayed:    [],
      cube:           game.cube,
      doubleOffer:    null,
    })
  }

  function offerDouble() {
    if (!game) return
    setGame({ ...game, doubleOffer: game.currentPlayer })
  }

  function resolveDouble(accept: boolean) {
    if (!game || !game.doubleOffer) return
    const doubler = game.doubleOffer
    if (!accept) {
      const winner = doubler
      setResult({ winner, type: 'NORMAL' })
      setPhase('gameover')
      return
    }
    setGame({
      ...game,
      cube: { value: game.cube.value * 2, owner: opponent(doubler) },
      doubleOffer: null,
    })
  }

  if (phase === 'gameover' && result) {
    const points = GAME_TYPE_POINTS[result.type] * game.cube.value
    return (
      <div className="animate-fade-in">
        <TopBar currentUser={currentUser} />
        <PageHeader title="Local Play" subtitle="Game over" />

        <div className="space-y-4">
          <div className="rounded-2xl border border-win/40 bg-win/5 p-8 text-center space-y-3">
            <Trophy className="mx-auto h-12 w-12 text-win" />
            <div>
              <p className="text-xs uppercase tracking-widest text-ink-subtle mb-1">Winner</p>
              <h2 className="text-3xl font-black text-win">{names[result.winner]}</h2>
              <p className="mt-2 text-sm text-ink-muted">
                {GAME_TYPE_LABEL[result.type]}
                {game.cube.value > 1 && ` · cube at ${game.cube.value}`}
                {' · '}{points} point{points === 1 ? '' : 's'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button onClick={startGame} variant="secondary" className="gap-2">
              <RotateCcw className="h-4 w-4" />
              Rematch
            </Button>
            <Link href="/quick-game">
              <Button variant="secondary" className="w-full gap-2">
                Score in Quick Game
              </Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="animate-fade-in">
      <TopBar currentUser={currentUser} />
      <PageHeader title="Local Play" subtitle="Two players, one device — pass and play" />

      <div className="space-y-4">
        {/* Toolbar */}
        <div className="flex items-center justify-end">
          <BoardCustomizeButton
            boardThemeId={boardThemeId}
            diceThemeId={diceThemeId}
            onBoard={chooseBoardTheme}
            onDice={chooseDiceTheme}
          />
        </div>

        {/* Turn banner */}
        <div className="rounded-xl border border-gold/40 bg-surface-raised px-4 py-3 text-center">
          <p className="text-xs uppercase tracking-widest text-ink-subtle">On roll</p>
          <p className="text-lg font-bold text-ink">{names[game.currentPlayer]}</p>
          {noLegalMoves && (
            <p className="mt-1 text-xs font-medium text-loss">No legal moves — passing…</p>
          )}
        </div>

        <BackgammonBoard
          board={liveBoard}
          perspective={game.currentPlayer}
          toMove={turnDone || noLegalMoves ? null : game.currentPlayer}
          dice={game.dice}
          legalSequences={game.legalSequences}
          movesPlayed={game.movesPlayed}
          onMove={handleMove}
          cube={game.cube}
          boardTheme={boardTheme}
          diceTheme={diceTheme}
        />

        {/* Controls */}
        <div className="flex flex-wrap gap-2">
          <Button onClick={undo} variant="secondary" disabled={game.movesPlayed.length === 0} className="gap-2">
            <Undo2 className="h-4 w-4" />
            Undo
          </Button>

          {(game.cube.owner === null || game.cube.owner === game.currentPlayer)
            && game.movesPlayed.length === 0 && !game.doubleOffer && (
            <Button onClick={offerDouble} variant="secondary" className="gap-2">
              Double ({game.cube.value} → {game.cube.value * 2})
            </Button>
          )}

          <Button onClick={endTurn} disabled={!turnDone && !noLegalMoves} className="ml-auto gap-2">
            {names[opponent(game.currentPlayer)]}&apos;s turn
            <ChevronLeft className="h-4 w-4 rotate-180" />
          </Button>
        </div>
      </div>

      {/* Double offer dialog */}
      <Dialog
        open={!!game.doubleOffer}
        onClose={() => {}}
        title="Double offered"
      >
        <p className="text-sm text-ink-muted">
          {game.doubleOffer && names[game.doubleOffer]} offers to double the stakes to{' '}
          <span className="font-bold text-gold">{game.cube.value * 2}</span>.{' '}
          {game.doubleOffer && names[opponent(game.doubleOffer)]}, do you accept?
        </p>
        <DialogFooter>
          <Button variant="secondary" onClick={() => resolveDouble(false)}>
            Decline (forfeit at {game.cube.value})
          </Button>
          <Button onClick={() => resolveDouble(true)}>
            Accept
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  )
}

/** True once the chosen `movesPlayed` is a maximal sequence (no further moves possible). */
function nextMovesEmpty(legalSequences: MoveSequence[], movesPlayed: Move[]): boolean {
  for (const seq of legalSequences) {
    if (seq.moves.length <= movesPlayed.length) continue
    let isPrefix = true
    for (let i = 0; i < movesPlayed.length; i++) {
      const a = movesPlayed[i], b = seq.moves[i]
      if (a.from !== b.from || a.to !== b.to || a.die !== b.die) { isPrefix = false; break }
    }
    if (isPrefix) return false
  }
  return true
}

// ─── Shared chrome ──────────────────────────────────────────────────────────

function TopBar({ currentUser }: { currentUser: SessionUser | null }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 -ml-2
          text-sm font-medium text-ink-muted hover:text-ink hover:bg-surface-raised transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
        Dashboard
      </Link>

      {currentUser ? (
        <Link
          href="/settings"
          className="inline-flex items-center gap-2 rounded-full border border-line
            bg-surface-raised pl-1.5 pr-3 py-1 hover:border-gold/30 transition-colors"
        >
          <Avatar name={currentUser.name} src={currentUser.avatarUrl} size="sm" />
          <span className="text-xs font-medium text-ink-muted">
            Signed in as <span className="font-semibold text-ink">{currentUser.name.split(' ')[0]}</span>
          </span>
        </Link>
      ) : (
        <div className="inline-flex items-center gap-1.5 rounded-full border border-line
          bg-surface-raised px-3 py-1.5 text-xs">
          <UserCircle2 className="h-3.5 w-3.5 text-ink-subtle" />
          <span className="text-ink-subtle">Not signed in ·</span>
          <Link href="/login?returnTo=/play" className="font-semibold text-gold hover:text-gold/80 transition-colors">
            Sign in
          </Link>
          <span className="text-ink-subtle">/</span>
          <Link href="/register" className="font-semibold text-gold hover:text-gold/80 transition-colors">
            Create account
          </Link>
        </div>
      )}
    </div>
  )
}

function PageHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-6 text-center">
      <div className="mb-3 inline-flex h-16 w-16 items-center justify-center
        rounded-2xl bg-surface-raised border border-line shadow-gold text-4xl">
        🎲
      </div>
      <h1 className="font-display text-3xl font-bold text-ink tracking-tight">{title}</h1>
      <p className="mt-1.5 text-sm text-ink-muted">{subtitle}</p>
    </div>
  )
}

function NameField({
  label, value, onChange, swatchClass,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  swatchClass: string
}) {
  return (
    <label className="flex items-center gap-3">
      <span className={cn('h-6 w-6 shrink-0 rounded-full border-2', swatchClass)} />
      <span className="w-14 shrink-0 text-sm font-medium text-ink-muted">{label}</span>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        maxLength={40}
        className={cn(
          'flex-1 rounded-lg border border-line bg-surface-elevated',
          'px-3 py-2.5 text-sm text-ink placeholder:text-ink-subtle',
          'focus:outline-none focus:ring-2 focus:ring-gold/60 focus:border-gold/60 transition-colors',
        )}
      />
    </label>
  )
}
