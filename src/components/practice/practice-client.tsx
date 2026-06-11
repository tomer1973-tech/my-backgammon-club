'use client'

/**
 * PracticeClient — play backgammon against a heuristic AI opponent.
 *
 * Mirrors the local hot-seat flow (`PlayClient`) but the board never flips —
 * it's always shown from the human's perspective — and the AI's turn plays
 * itself out automatically after a short "thinking" delay.
 */

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ChevronLeft, UserCircle2, Dices, Undo2, RotateCcw, Trophy, Bot, Palette, Check, ArrowRight } from 'lucide-react'
import { Avatar }  from '@/components/ui/avatar'
import { Button }  from '@/components/ui/button'
import { Dialog, DialogFooter } from '@/components/ui/dialog'
import { BackgammonBoard } from '@/components/backgammon'
import { cn } from '@/lib/utils'
import type { SessionUser } from '@/types'
import {
  createInitialBoard, opponent, applyMove, getLegalSequences,
  isGameOver, getGameType, rollDice, chooseAIMove, evaluateBoard,
  type Board, type Player, type Dice, type Move, type MoveSequence, type GameType, type CubeState, type Difficulty,
} from '@/lib/backgammon'
import {
  BOARD_THEMES, DICE_THEMES, getBoardTheme, getDiceTheme,
} from '@/lib/backgammon/themes'

const BOARD_THEME_KEY = 'pb_board_theme'
const DICE_THEME_KEY  = 'pb_dice_theme'

type Phase = 'setup' | 'playing' | 'gameover'

const GAME_TYPE_LABEL: Record<GameType, string> = {
  NORMAL: 'Normal', GAMMON: 'Gammon', BACKGAMMON: 'Backgammon',
}
const GAME_TYPE_POINTS: Record<GameType, number> = { NORMAL: 1, GAMMON: 2, BACKGAMMON: 3 }

const DIFFICULTIES: { value: Difficulty; label: string; hint: string }[] = [
  { value: 'easy',   label: 'Easy',   hint: 'Mostly random moves' },
  { value: 'medium', label: 'Medium', hint: 'Solid but imperfect' },
  { value: 'hard',   label: 'Hard',   hint: 'Plays its best move' },
]

interface GameState {
  boardHistory:   Board[]
  currentPlayer:  Player
  dice:           Dice | null
  legalSequences: MoveSequence[]
  movesPlayed:    Move[]
  cube:           CubeState
  doubleOffer:    Player | null
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

export function PracticeClient({ currentUser }: { currentUser: SessionUser | null }) {
  const [phase, setPhase] = useState<Phase>('setup')
  const [humanPlayer, setHumanPlayer] = useState<Player>('white')
  const [difficulty, setDifficulty] = useState<Difficulty>('medium')
  const [game, setGame] = useState<GameState | null>(null)
  const [result, setResult] = useState<{ winner: Player; type: GameType } | null>(null)
  const [aiThinking, setAiThinking] = useState(false)

  // Board & dice appearance (persisted across sessions)
  const [boardThemeId, setBoardThemeId] = useState('classic')
  const [diceThemeId, setDiceThemeId]   = useState('ivory')
  const [customizeOpen, setCustomizeOpen] = useState(false)

  useEffect(() => {
    const b = localStorage.getItem(BOARD_THEME_KEY)
    const d = localStorage.getItem(DICE_THEME_KEY)
    if (b) setBoardThemeId(b)
    if (d) setDiceThemeId(d)
  }, [])

  function chooseBoardTheme(id: string) { setBoardThemeId(id); localStorage.setItem(BOARD_THEME_KEY, id) }
  function chooseDiceTheme(id: string)  { setDiceThemeId(id);  localStorage.setItem(DICE_THEME_KEY, id) }

  const boardTheme = getBoardTheme(boardThemeId)
  const diceTheme  = getDiceTheme(diceThemeId)

  const aiPlayer = opponent(humanPlayer)

  function startGame(player: Player) {
    setHumanPlayer(player)
    setGame(freshGame())
    setResult(null)
    setPhase('playing')
  }

  const liveBoard = game ? game.boardHistory[game.boardHistory.length - 1] : null

  // ── AI turn: think, then play its whole sequence and pass back ──────────
  useEffect(() => {
    if (phase !== 'playing' || !game || !liveBoard) return
    if (game.currentPlayer !== aiPlayer || game.doubleOffer) return

    setAiThinking(true)
    const timer = setTimeout(() => {
      const seq = chooseAIMove(liveBoard, aiPlayer, game.dice!, difficulty)
      const finalBoard = seq.board
      const winner = isGameOver(finalBoard)

      if (winner) {
        setResult({ winner, type: getGameType(finalBoard, winner) })
        setGame(g => g && ({ ...g, boardHistory: [...g.boardHistory, finalBoard], movesPlayed: seq.moves }))
        setPhase('gameover')
        setAiThinking(false)
        return
      }

      const nextDice = rollDice()
      setGame({
        boardHistory:   [finalBoard],
        currentPlayer:  humanPlayer,
        dice:           nextDice,
        legalSequences: getLegalSequences(finalBoard, humanPlayer, nextDice),
        movesPlayed:    [],
        cube:           game.cube,
        doubleOffer:    null,
      })
      setAiThinking(false)
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, 900)

    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, game?.currentPlayer, game?.dice, game?.doubleOffer])

  // ── AI responds to a human double offer ──────────────────────────────────
  useEffect(() => {
    if (phase !== 'playing' || !game || !liveBoard) return
    if (game.doubleOffer !== humanPlayer) return

    setAiThinking(true)
    const timer = setTimeout(() => {
      const accept = evaluateBoard(liveBoard, aiPlayer) > -8
      if (!accept) {
        setResult({ winner: humanPlayer, type: 'NORMAL' })
        setPhase('gameover')
        setAiThinking(false)
        return
      }
      setGame(g => g && ({
        ...g,
        cube: { value: g.cube.value * 2, owner: humanPlayer },
        doubleOffer: null,
      }))
      setAiThinking(false)
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, 800)

    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, game?.doubleOffer])

  if (phase === 'setup') {
    return (
      <div className="animate-fade-in">
        <TopBar currentUser={currentUser} />
        <PageHeader title="Practice vs AI" subtitle="Sharpen your game against a computer opponent" />

        <div className="space-y-4">
          <div className="rounded-2xl border border-line bg-surface-raised p-5 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-subtle">Play as</p>
            <div className="grid grid-cols-2 gap-3">
              {(['white', 'black'] as Player[]).map(p => (
                <button
                  key={p}
                  onClick={() => setHumanPlayer(p)}
                  className={cn(
                    'flex items-center justify-center gap-2 rounded-xl border-2 px-4 py-3 text-sm font-semibold transition-all',
                    humanPlayer === p
                      ? 'border-gold bg-gold/10 text-gold'
                      : 'border-line bg-surface-elevated text-ink-muted hover:border-gold/40',
                  )}
                >
                  <span className={cn(
                    'h-5 w-5 rounded-full border-2',
                    p === 'white'
                      ? 'bg-[hsl(40,35%,94%)] border-[hsl(40,20%,75%)]'
                      : 'bg-[hsl(25,20%,14%)] border-gold/60',
                  )} />
                  {p === 'white' ? 'White' : 'Black'}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-line bg-surface-raised p-5 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-subtle">Difficulty</p>
            <div className="grid grid-cols-3 gap-2">
              {DIFFICULTIES.map(d => (
                <button
                  key={d.value}
                  onClick={() => setDifficulty(d.value)}
                  className={cn(
                    'rounded-lg border px-2 py-3 text-xs font-medium transition-all',
                    difficulty === d.value
                      ? 'border-gold bg-gold/10 text-gold'
                      : 'border-line bg-surface-elevated text-ink-muted hover:border-gold/40',
                  )}
                >
                  <span className="block font-semibold">{d.label}</span>
                  <span className="mt-0.5 block text-[10px] opacity-70">{d.hint}</span>
                </button>
              ))}
            </div>
          </div>

          <Button onClick={() => startGame(humanPlayer)} size="lg" className="w-full gap-2">
            <Dices className="h-5 w-5" />
            Start game
          </Button>
        </div>
      </div>
    )
  }

  if (!game || !liveBoard) return null

  const noLegalMoves = game.dice !== null
    && game.legalSequences.length === 1
    && game.legalSequences[0].moves.length === 0
  const turnDone = game.dice !== null && !noLegalMoves
    && nextMovesEmpty(game.legalSequences, game.movesPlayed)
  const isHumanTurn = game.currentPlayer === humanPlayer && !aiThinking && !game.doubleOffer

  function handleMove(move: Move) {
    if (!game || !liveBoard) return
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
    if (!game || !liveBoard) return
    const next = opponent(game.currentPlayer)
    const dice = rollDice()
    setGame({
      boardHistory:   [liveBoard],
      currentPlayer:  next,
      dice,
      legalSequences: getLegalSequences(liveBoard, next, dice),
      movesPlayed:    [],
      cube:           game.cube,
      doubleOffer:    null,
    })
  }

  function offerDouble() {
    if (!game) return
    setGame({ ...game, doubleOffer: humanPlayer })
  }

  if (phase === 'gameover' && result && game) {
    const youWon = result.winner === humanPlayer
    const points = GAME_TYPE_POINTS[result.type] * game.cube.value
    return (
      <div className="animate-fade-in">
        <TopBar currentUser={currentUser} />
        <PageHeader title="Practice vs AI" subtitle="Game over" />

        <div className="space-y-4">
          <div className={cn(
            'rounded-2xl border p-8 text-center space-y-3',
            youWon ? 'border-win/40 bg-win/5' : 'border-loss/40 bg-loss/5',
          )}>
            <Trophy className={cn('mx-auto h-12 w-12', youWon ? 'text-win' : 'text-loss')} />
            <div>
              <p className="text-xs uppercase tracking-widest text-ink-subtle mb-1">
                {youWon ? 'You win!' : 'AI wins'}
              </p>
              <h2 className={cn('text-3xl font-black', youWon ? 'text-win' : 'text-loss')}>
                {youWon ? (currentUser?.name.split(' ')[0] ?? 'You') : 'AI'}
              </h2>
              <p className="mt-2 text-sm text-ink-muted">
                {GAME_TYPE_LABEL[result.type]}
                {game.cube.value > 1 && ` · cube at ${game.cube.value}`}
                {' · '}{points} point{points === 1 ? '' : 's'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button onClick={() => startGame(humanPlayer)} variant="secondary" className="gap-2">
              <RotateCcw className="h-4 w-4" />
              Rematch
            </Button>
            <Button onClick={() => setPhase('setup')} variant="secondary" className="gap-2">
              Change settings
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="animate-fade-in">
      <TopBar currentUser={currentUser} />
      <PageHeader title="Practice vs AI" subtitle={`Playing as ${humanPlayer === 'white' ? 'White' : 'Black'} · ${difficulty}`} />

      <div className="space-y-4">
        {/* Toolbar */}
        <div className="flex items-center justify-end">
          <button
            onClick={() => setCustomizeOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-line
              bg-surface-raised px-3 py-1.5 text-xs font-medium text-ink-muted
              hover:border-gold/40 hover:text-ink transition-colors"
          >
            <Palette className="h-3.5 w-3.5" />
            Board &amp; dice
          </button>
        </div>

        {/* Turn indicator */}
        <TurnBanner
          humanName={currentUser?.name.split(' ')[0] ?? 'You'}
          isHumanOnRoll={game.currentPlayer === humanPlayer}
          aiThinking={aiThinking}
          noLegalMoves={noLegalMoves && !aiThinking}
        />

        <BackgammonBoard
          board={liveBoard}
          perspective={humanPlayer}
          toMove={isHumanTurn && !turnDone && !noLegalMoves ? humanPlayer : null}
          dice={game.dice}
          legalSequences={game.legalSequences}
          movesPlayed={game.movesPlayed}
          onMove={handleMove}
          cube={game.cube}
          disabled={!isHumanTurn}
          boardTheme={boardTheme}
          diceTheme={diceTheme}
        />

        {/* Controls */}
        {game.currentPlayer === humanPlayer && (
          <div className="flex items-center gap-2 rounded-xl border border-line bg-surface-raised p-2">
            <Button
              onClick={undo}
              variant="ghost"
              size="sm"
              disabled={game.movesPlayed.length === 0}
              className="gap-1.5"
            >
              <Undo2 className="h-4 w-4" />
              Undo
            </Button>

            {(game.cube.owner === null || game.cube.owner === humanPlayer)
              && game.movesPlayed.length === 0 && !game.doubleOffer && (
              <Button onClick={offerDouble} variant="ghost" size="sm" className="gap-1.5">
                <span className="text-base leading-none">⚂</span>
                Double → {game.cube.value * 2}
              </Button>
            )}

            <Button
              onClick={endTurn}
              size="sm"
              disabled={!turnDone && !noLegalMoves}
              className="ml-auto gap-1.5"
            >
              {noLegalMoves ? 'Pass turn' : 'End turn'}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Double offer dialog */}
      <Dialog open={!!game.doubleOffer} onClose={() => {}} title="Double offered">
        <p className="text-sm text-ink-muted">
          You offer to double the stakes to{' '}
          <span className="font-bold text-gold">{game.cube.value * 2}</span>.{' '}
          {aiThinking ? 'The AI is thinking…' : 'Waiting for the AI…'}
        </p>
        <DialogFooter>
          <span />
        </DialogFooter>
      </Dialog>

      {/* Board & dice customization */}
      <CustomizeDialog
        open={customizeOpen}
        onClose={() => setCustomizeOpen(false)}
        boardThemeId={boardThemeId}
        diceThemeId={diceThemeId}
        onBoard={chooseBoardTheme}
        onDice={chooseDiceTheme}
      />
    </div>
  )
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
          <Link href="/login?returnTo=/practice" className="font-semibold text-gold hover:text-gold/80 transition-colors">
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
        🤖
      </div>
      <h1 className="font-display text-3xl font-bold text-ink tracking-tight">{title}</h1>
      <p className="mt-1.5 text-sm text-ink-muted">{subtitle}</p>
    </div>
  )
}

// ─── Two-sided turn indicator ────────────────────────────────────────────────

function TurnBanner({
  humanName, isHumanOnRoll, aiThinking, noLegalMoves,
}: {
  humanName: string
  isHumanOnRoll: boolean
  aiThinking: boolean
  noLegalMoves: boolean
}) {
  const status = isHumanOnRoll
    ? (noLegalMoves ? 'No legal moves — pass the turn' : 'Your move')
    : (aiThinking ? 'AI is thinking…' : 'AI to play')

  return (
    <div className="rounded-2xl border border-line bg-surface-raised p-2">
      <div className="grid grid-cols-2 gap-2">
        {/* You */}
        <div className={cn(
          'flex items-center gap-2.5 rounded-xl border px-3 py-2.5 transition-all',
          isHumanOnRoll ? 'border-gold/60 bg-gold/10' : 'border-transparent opacity-50',
        )}>
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-elevated">
            <UserCircle2 className={cn('h-5 w-5', isHumanOnRoll ? 'text-gold' : 'text-ink-subtle')} />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-ink">{humanName}</p>
            <p className="text-[11px] text-ink-subtle">You</p>
          </div>
          {isHumanOnRoll && <span className="ml-auto h-2 w-2 shrink-0 rounded-full bg-gold animate-pulse" />}
        </div>

        {/* AI */}
        <div className={cn(
          'flex items-center justify-end gap-2.5 rounded-xl border px-3 py-2.5 text-right transition-all',
          !isHumanOnRoll ? 'border-gold/60 bg-gold/10' : 'border-transparent opacity-50',
        )}>
          {!isHumanOnRoll && <span className="mr-auto h-2 w-2 shrink-0 rounded-full bg-gold animate-pulse" />}
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-ink">AI</p>
            <p className="text-[11px] text-ink-subtle">Computer</p>
          </div>
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-elevated">
            <Bot className={cn('h-5 w-5', !isHumanOnRoll ? 'text-gold' : 'text-ink-subtle')} />
          </span>
        </div>
      </div>

      <p className={cn(
        'mt-2 text-center text-xs font-semibold',
        noLegalMoves ? 'text-loss' : isHumanOnRoll ? 'text-gold' : 'text-ink-muted',
        aiThinking && 'animate-pulse',
      )}>
        {status}
      </p>
    </div>
  )
}

// ─── Board & dice customization dialog ───────────────────────────────────────

const DIE_PREVIEW_PIPS = [[0, 0], [0, 2], [1, 1], [2, 0], [2, 2]]

function CustomizeDialog({
  open, onClose, boardThemeId, diceThemeId, onBoard, onDice,
}: {
  open: boolean
  onClose: () => void
  boardThemeId: string
  diceThemeId: string
  onBoard: (id: string) => void
  onDice: (id: string) => void
}) {
  return (
    <Dialog open={open} onClose={onClose} title="Board & dice" size="md">
      <div className="space-y-5">
        {/* Board */}
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-subtle">Board colour</p>
          <div className="grid grid-cols-5 gap-2">
            {BOARD_THEMES.map(t => (
              <button
                key={t.id}
                onClick={() => onBoard(t.id)}
                className={cn(
                  'relative rounded-xl border-2 p-1.5 transition-all',
                  boardThemeId === t.id ? 'border-gold' : 'border-line hover:border-gold/40',
                )}
              >
                <div className="relative h-10 overflow-hidden rounded-lg" style={{ backgroundColor: t.felt }}>
                  <span className="absolute bottom-0 left-[18%] h-7 w-3" style={{ backgroundColor: t.pointDark, clipPath: 'polygon(0 100%,100% 100%,50% 0)' }} />
                  <span className="absolute bottom-0 left-[44%] h-7 w-3" style={{ backgroundColor: t.pointLight, clipPath: 'polygon(0 100%,100% 100%,50% 0)' }} />
                  <span className="absolute bottom-0 right-[18%] h-7 w-3" style={{ backgroundColor: t.pointDark, clipPath: 'polygon(0 100%,100% 100%,50% 0)' }} />
                </div>
                <span className="mt-1 block text-center text-[10px] font-medium text-ink-muted">{t.label}</span>
                {boardThemeId === t.id && (
                  <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-gold text-surface-base">
                    <Check className="h-2.5 w-2.5" strokeWidth={3} />
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Dice */}
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-subtle">Dice colour</p>
          <div className="grid grid-cols-5 gap-2">
            {DICE_THEMES.map(d => (
              <button
                key={d.id}
                onClick={() => onDice(d.id)}
                className={cn(
                  'relative flex flex-col items-center rounded-xl border-2 p-1.5 transition-all',
                  diceThemeId === d.id ? 'border-gold' : 'border-line hover:border-gold/40',
                )}
              >
                <div
                  className="grid h-10 w-10 grid-cols-3 grid-rows-3 gap-[2px] rounded-md border p-1.5"
                  style={{ backgroundColor: d.bg, borderColor: d.border }}
                >
                  {Array.from({ length: 9 }).map((_, i) => {
                    const r = Math.floor(i / 3), c = i % 3
                    const on = DIE_PREVIEW_PIPS.some(([pr, pc]) => pr === r && pc === c)
                    return <span key={i} className="rounded-full" style={on ? { backgroundColor: d.pip } : undefined} />
                  })}
                </div>
                <span className="mt-1 block text-center text-[10px] font-medium text-ink-muted">{d.label}</span>
                {diceThemeId === d.id && (
                  <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-gold text-surface-base">
                    <Check className="h-2.5 w-2.5" strokeWidth={3} />
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      <DialogFooter>
        <Button onClick={onClose} size="sm">Done</Button>
      </DialogFooter>
    </Dialog>
  )
}
