'use client'

/**
 * PracticeClient — play backgammon against a heuristic AI opponent.
 *
 * Playing phase uses a sidebar layout: compact game info on the left,
 * board + controls on the right — keeping the full-height board prominent.
 */

import { useEffect, useRef, useState } from 'react'
import { playSound, isMuted, setMuted } from '@/lib/sound'
import Link from 'next/link'
import { ChevronLeft, UserCircle2, Dices, Undo2, RotateCcw, Trophy, Bot, ArrowRight, Lightbulb, MessageCircle, Share2, Volume2, VolumeX } from 'lucide-react'
import { Avatar }  from '@/components/ui/avatar'
import { Button }  from '@/components/ui/button'
import { Dialog, DialogFooter } from '@/components/ui/dialog'
import { BackgammonBoard, MovesCounter } from '@/components/backgammon'
import { useBoardThemes, BoardCustomizeButton } from '@/components/backgammon/board-customizer'
import { cn } from '@/lib/utils'
import type { SessionUser } from '@/types'
import {
  createInitialBoard, opponent, applyMove, getLegalSequences,
  isGameOver, getGameType, rollDice, chooseAIMove, evaluateBoard,
  bestSequence, notateSequence, explainPlay, diceToPlay,
  type Board, type Player, type Dice, type Move, type MoveSequence, type GameType, type CubeState, type Difficulty,
} from '@/lib/backgammon'

interface Hint { move: Move | null; notation: string; why: string }

type Phase = 'setup' | 'playing' | 'gameover'

const GAME_TYPE_LABEL: Record<GameType, string> = {
  NORMAL: 'Normal', GAMMON: 'Gammon', BACKGAMMON: 'Backgammon',
}
const GAME_TYPE_POINTS: Record<GameType, number> = { NORMAL: 1, GAMMON: 2, BACKGAMMON: 3 }

const SPEEDS = [
  { value: 'slow',   label: 'Slow',   stepMs: 2400 },
  { value: 'normal', label: 'Normal', stepMs: 1600 },
  { value: 'fast',   label: 'Fast',   stepMs: 900 },
] as const
type Speed = typeof SPEEDS[number]['value']

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

/** Pip count remaining for a player (lower = closer to winning). */
function pipCount(board: Board, player: Player): number {
  let count = 0
  for (let i = 0; i < 24; i++) {
    const n = board.points[i]
    if (player === 'white' && n > 0) count += (i + 1) * n
    if (player === 'black' && n < 0) count += (24 - i) * (-n)
  }
  count += board.bar[player] * 25
  return count
}

export function PracticeClient({ currentUser }: { currentUser: SessionUser | null }) {
  const [phase, setPhase] = useState<Phase>('setup')
  const [humanPlayer, setHumanPlayer] = useState<Player>('white')
  const [difficulty, setDifficulty] = useState<Difficulty>('medium')
  const [aiPreview, setAiPreview] = useState<Move | null>(null)
  const [speed, setSpeed] = useState<Speed>('normal')
  useEffect(() => {
    try {
      const v = localStorage.getItem('practice-ai-speed')
      if (v === 'slow' || v === 'normal' || v === 'fast') setSpeed(v)
    } catch {}
  }, [])
  function chooseSpeed(v: Speed) {
    setSpeed(v)
    try { localStorage.setItem('practice-ai-speed', v) } catch {}
  }
  const [game, setGame] = useState<GameState | null>(null)
  const [result, setResult] = useState<{ winner: Player; type: GameType } | null>(null)
  const [aiThinking, setAiThinking] = useState(false)
  const [showYourTurn, setShowYourTurn] = useState(false)

  const { boardThemeId, diceThemeId, boardTheme, diceTheme, chooseBoardTheme, chooseDiceTheme } = useBoardThemes()
  const [hint, setHint] = useState<Hint | null>(null)

  const aiPlayer = opponent(humanPlayer)
  const [muted, setMutedState] = useState(false)
  useEffect(() => { setMutedState(isMuted()) }, [])
  function toggleMute() { setMuted(!muted); setMutedState(!muted) }
  const boardSteps = game?.boardHistory.length ?? 0
  const turnKey = `${game?.currentPlayer}-${game?.dice?.join('')}`
  useEffect(() => { if (phase === 'playing' && boardSteps > 1) playSound('move') }, [boardSteps, phase])
  useEffect(() => { if (phase === 'playing' && game?.dice) playSound('dice') }, [turnKey, phase]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (phase === 'gameover' && result) playSound(result.winner === humanPlayer ? 'win' : 'lose') }, [phase]) // eslint-disable-line react-hooks/exhaustive-deps

  function startGame(player: Player) {
    setHumanPlayer(player)
    setGame(freshGame())
    setResult(null)
    setPhase('playing')
  }

  const liveBoard = game ? game.boardHistory[game.boardHistory.length - 1] : null

  // ── AI turn ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'playing' || !game || !liveBoard) return
    if (game.currentPlayer !== aiPlayer || game.doubleOffer) return

    setAiThinking(true)
    const STEP_MS = SPEEDS.find(x => x.value === speed)!.stepMs
    const timers: ReturnType<typeof setTimeout>[] = []
    const seq = chooseAIMove(liveBoard, aiPlayer, game.dice!, difficulty)
    const cube = game.cube

    // Pause so the player sees the AI's dice, then play one checker move at a time.
    let t = Math.round(STEP_MS * 1.2)
    let board = liveBoard
    seq.moves.forEach((move, i) => {
      board = applyMove(board, aiPlayer, move)
      const stepBoard = board
      const played = seq.moves.slice(0, i + 1)
      timers.push(setTimeout(() => setAiPreview(move), t))
      timers.push(setTimeout(() => {
        setAiPreview(null)
        setGame(g => g && ({ ...g, boardHistory: [...g.boardHistory, stepBoard], movesPlayed: played }))
      }, t + Math.round(STEP_MS * 0.6)))
      t += STEP_MS
    })

    timers.push(setTimeout(() => {
      const finalBoard = seq.board
      const winner = isGameOver(finalBoard)
      if (winner) {
        setResult({ winner, type: getGameType(finalBoard, winner) })
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
        cube,
        doubleOffer:    null,
      })
      setAiThinking(false)
    }, t + 300))

    return () => { timers.forEach(clearTimeout); setAiPreview(null) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, game?.currentPlayer, game?.dice, game?.doubleOffer])

  // ── AI responds to double offer ──────────────────────────────────────────
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

  // ── Auto-pass when no legal moves ────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'playing' || !game) return
    if (game.currentPlayer !== humanPlayer || aiThinking || game.doubleOffer) return
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
    }, 1400)

    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, game?.currentPlayer, game?.dice, game?.legalSequences, aiThinking])

  useEffect(() => { setHint(null) }, [game?.currentPlayer, game?.movesPlayed.length])

  // Flash "YOUR TURN!" when it becomes the human's turn (not on first load)
  const prevPlayerRef = useRef<Player | null>(null)
  useEffect(() => {
    if (!game) return
    const prev = prevPlayerRef.current
    prevPlayerRef.current = game.currentPlayer
    if (prev !== null && prev !== game.currentPlayer && game.currentPlayer === humanPlayer && !aiThinking) {
      setShowYourTurn(true)
      const t = setTimeout(() => setShowYourTurn(false), 1800)
      return () => clearTimeout(t)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game?.currentPlayer, aiThinking])

  function showHint() {
    if (!game || !game.dice) return
    const seq = bestSequence(game.boardHistory[0], game.currentPlayer, game.dice, game.movesPlayed)
    if (!seq || seq.moves.length === 0) { setHint(null); return }
    const move = seq.moves.length > game.movesPlayed.length ? seq.moves[game.movesPlayed.length] : null
    setHint({
      move,
      notation: notateSequence(game.currentPlayer, seq.moves),
      why:      explainPlay(game.boardHistory[0], seq.board, game.currentPlayer, seq.moves),
    })
  }

  const humanName = currentUser?.name.split(' ')[0] ?? 'You'

  // ── Setup screen ─────────────────────────────────────────────────────────

  if (phase === 'setup') {
    const diff = DIFFICULTIES.find(d => d.value === difficulty)!
    return (
      <div className="animate-fade-in">
        <CompactTopBar currentUser={currentUser} />

        <div className="mx-auto max-w-md">
          <div className="relative overflow-hidden rounded-[28px] border border-line bg-surface-raised shadow-xl">
            {/* Hero */}
            <div className="relative px-6 pb-7 pt-8 text-center">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_80%_at_50%_0%,hsl(var(--gold)/0.22),transparent_70%)]" />
              <svg viewBox="0 0 240 60" className="pointer-events-none absolute inset-x-0 top-0 h-16 w-full opacity-[0.12]" preserveAspectRatio="none" aria-hidden>
                {Array.from({ length: 12 }).map((_, i) => (
                  <polygon key={i} points={`${i * 20},0 ${i * 20 + 20},0 ${i * 20 + 10},60`} fill={i % 2 ? 'hsl(var(--ink))' : 'hsl(var(--gold))'} />
                ))}
              </svg>
              <div className="relative mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-gold to-gold/60 text-surface-canvas shadow-lg shadow-gold/30">
                <Bot className="h-8 w-8" />
              </div>
              <h1 className="relative font-display text-3xl font-bold tracking-tight text-ink">Play vs AI</h1>
              <p className="relative mt-1.5 text-sm text-ink-muted">Pick your side and challenge the computer</p>
            </div>

            <div className="space-y-6 border-t border-line bg-surface-canvas/40 px-5 py-6">
              <SetupRow label="Your checkers">
                <div className="grid grid-cols-2 gap-2">
                  {(['white', 'black'] as Player[]).map(p => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setHumanPlayer(p)}
                      className={cn(
                        'group flex items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-all active:scale-[0.98]',
                        humanPlayer === p
                          ? 'border-gold bg-gold/10 ring-4 ring-gold/10'
                          : 'border-line bg-surface-raised hover:border-gold/40',
                      )}
                    >
                      <span className={cn(
                        'h-8 w-8 shrink-0 rounded-full shadow-inner ring-2',
                        p === 'white'
                          ? 'bg-gradient-to-br from-white to-[hsl(40,25%,82%)] ring-[hsl(40,20%,70%)]'
                          : 'bg-gradient-to-br from-[hsl(25,15%,28%)] to-[hsl(25,20%,8%)] ring-gold/50',
                      )} />
                      <span>
                        <span className={cn('block text-sm font-semibold', humanPlayer === p ? 'text-gold' : 'text-ink')}>
                          {p === 'white' ? 'White' : 'Black'}
                        </span>
                        <span className="block text-[11px] text-ink-subtle">{p === 'white' ? 'Classic light' : 'Classic dark'}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </SetupRow>

              <SetupRow label="Difficulty" hint={diff.hint}>
                <Segmented
                  value={difficulty}
                  onChange={v => setDifficulty(v as Difficulty)}
                  options={DIFFICULTIES.map(d => ({ value: d.value, label: d.label }))}
                />
              </SetupRow>

              <SetupRow label="AI move speed" hint="Pause per move">
                <Segmented
                  value={speed}
                  onChange={v => chooseSpeed(v as Speed)}
                  options={SPEEDS.map(sp => ({ value: sp.value, label: sp.label }))}
                />
              </SetupRow>

              <button
                type="button"
                onClick={() => startGame(humanPlayer)}
                className="group flex w-full items-center justify-between gap-3 rounded-2xl bg-gradient-to-r from-gold to-gold/80 px-5 py-4 text-surface-canvas shadow-lg shadow-gold/25 transition-all hover:shadow-gold/40 active:scale-[0.99]"
              >
                <span className="flex items-center gap-3">
                  <Dices className="h-5 w-5" />
                  <span className="text-base font-bold">Start game</span>
                </span>
                <span className="flex items-center gap-2 text-xs font-semibold opacity-80">
                  {diff.label} · {SPEEDS.find(x => x.value === speed)!.label}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </span>
              </button>
            </div>
          </div>
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

  // ── Gameover screen ───────────────────────────────────────────────────────

  if (phase === 'gameover' && result && game) {
    const youWon = result.winner === humanPlayer
    const points = GAME_TYPE_POINTS[result.type] * game.cube.value

    function shareWin() {
      const text = `🎲 I just beat the AI in backgammon! ${GAME_TYPE_LABEL[result!.type]}${game!.cube.value > 1 ? ` (cube at ${game!.cube.value})` : ''} — ${points} point${points === 1 ? '' : 's'}. Play at My Backgammon Club!`
      const url = `https://wa.me/?text=${encodeURIComponent(text)}`
      window.open(url, '_blank', 'noopener,noreferrer')
    }

    function shareTwitter() {
      const text = `🎲 Just beat the AI in backgammon! ${GAME_TYPE_LABEL[result!.type]} — ${points} pts. #backgammon`
      window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer')
    }

    return (
      <div className="animate-fade-in">
        <CompactTopBar currentUser={currentUser} />

        <div className="space-y-4 mt-6">
          <div className={cn(
            'rounded-2xl border p-8 text-center space-y-3',
            youWon ? 'border-win/40 bg-win/5' : 'border-loss/40 bg-loss/5',
          )}>
            <div className="text-5xl mb-2">{youWon ? '🏆' : '🤖'}</div>
            <div>
              <p className="text-xs uppercase tracking-widest text-ink-subtle mb-1">
                {youWon ? 'You win!' : 'AI wins'}
              </p>
              <h2 className={cn('text-3xl font-black', youWon ? 'text-win' : 'text-loss')}>
                {youWon ? humanName : 'AI'}
              </h2>
              <p className="mt-2 text-sm text-ink-muted">
                {GAME_TYPE_LABEL[result.type]}
                {game.cube.value > 1 && ` · cube at ${game.cube.value}`}
                {' · '}{points} point{points === 1 ? '' : 's'}
              </p>
            </div>
          </div>

          {youWon && (
            <div className="rounded-xl border border-line bg-surface-raised p-4 space-y-2">
              <p className="text-xs font-semibold text-ink-subtle uppercase tracking-wide">Share your win</p>
              <div className="flex gap-2">
                <button
                  onClick={shareWin}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-green-600/30 bg-green-500/10 px-3 py-2 text-sm font-medium text-green-700 transition-colors hover:bg-green-500/20"
                >
                  <MessageCircle className="h-4 w-4" />
                  WhatsApp
                </button>
                <button
                  onClick={shareTwitter}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-sky-600/30 bg-sky-500/10 px-3 py-2 text-sm font-medium text-sky-700 transition-colors hover:bg-sky-500/20"
                >
                  <Share2 className="h-4 w-4" />
                  Twitter / X
                </button>
              </div>
            </div>
          )}

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

  // ── Playing screen — sidebar layout ──────────────────────────────────────

  const humanPips = pipCount(liveBoard, humanPlayer)
  const aiPips    = pipCount(liveBoard, aiPlayer)
  const turnStatus = isHumanTurn
    ? (noLegalMoves ? 'No moves — passing…' : 'Your move')
    : (aiThinking ? 'AI is thinking…' : 'AI to play')

  return (
    <div className="animate-fade-in">

      {/* ── Mobile player strip (< lg) ── */}
      <div className="mb-3 [@media(max-height:500px)]:mb-1.5 flex items-center gap-3 lg:hidden">
        <Link
          href="/"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-surface-raised border border-line text-ink-muted hover:text-ink transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
        </Link>
        <div className={cn(
          'flex-1 rounded-xl border px-3 py-2 flex items-center gap-2 transition-all',
          !isHumanTurn ? 'border-gold/50 bg-gold/10' : 'border-line bg-surface-raised opacity-70',
        )}>
          <Bot className={cn('h-4 w-4 shrink-0', !isHumanTurn ? 'text-gold' : 'text-ink-subtle')} />
          <span className="text-xs font-semibold text-ink flex-1">AI</span>
          <span className={cn('text-sm font-bold tabular-nums', !isHumanTurn ? 'text-gold' : 'text-ink-muted')}>{aiPips}</span>
          <span className="text-[9px] text-ink-subtle">pip</span>
        </div>
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-gold/50 bg-surface-elevated text-xs font-bold text-gold">
          {game.cube.value}
        </div>
        <div className={cn(
          'flex-1 rounded-xl border px-3 py-2 flex items-center gap-2 transition-all',
          isHumanTurn ? 'border-gold/50 bg-gold/10' : 'border-line bg-surface-raised opacity-70',
        )}>
          <UserCircle2 className={cn('h-4 w-4 shrink-0', isHumanTurn ? 'text-gold' : 'text-ink-subtle')} />
          <span className="text-xs font-semibold text-ink flex-1 truncate">{humanName}</span>
          <span className={cn('text-sm font-bold tabular-nums', isHumanTurn ? 'text-gold' : 'text-ink-muted')}>{humanPips}</span>
          <span className="text-[9px] text-ink-subtle">pip</span>
        </div>
      </div>

    <div className="flex gap-5 items-start">

      {/* ── Left sidebar (desktop only) ── */}
      <aside className="hidden lg:flex w-52 shrink-0 flex-col gap-3 sticky top-6">

        {/* Compact brand + nav */}
        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-surface-raised border border-line text-ink-muted hover:text-ink hover:border-gold/30 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </Link>
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            <span className="text-xl">🤖</span>
            <div className="min-w-0">
              <p className="text-xs font-bold text-ink leading-none">Practice vs AI</p>
              <p className="text-[10px] text-ink-muted mt-0.5 capitalize">{difficulty} difficulty</p>
            </div>
          </div>
          {currentUser && (
            <Link href="/settings" className="shrink-0">
              <Avatar name={currentUser.name} src={currentUser.avatarUrl ?? undefined} size="sm" />
            </Link>
          )}
        </div>

        {/* AI card */}
        <PlayerSideCard
          name="AI"
          sub="Computer"
          isActive={!isHumanTurn}
          pips={aiPips}
          icon="bot"
        />

        {/* Doubling cube */}
        <div className="flex items-center gap-2 px-1">
          <div className="h-px flex-1 bg-line" />
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-gold/50 bg-surface-elevated text-xs font-bold text-gold shadow-sm">
            {game.cube.value}
          </div>
          <div className="text-[10px] text-ink-subtle">cube</div>
          <div className="h-px flex-1 bg-line" />
        </div>

        {/* Human card */}
        <PlayerSideCard
          name={humanName}
          sub="You"
          isActive={isHumanTurn}
          pips={humanPips}
          icon="user"
        />

        {/* Turn status pill */}
        <div className={cn(
          'rounded-xl border px-3 py-2 text-center text-xs font-semibold transition-all',
          isHumanTurn && !noLegalMoves ? 'border-gold/50 bg-gold/10 text-gold' : '',
          noLegalMoves ? 'border-loss/30 bg-loss/5 text-loss' : '',
          !isHumanTurn ? 'border-line bg-surface-raised text-ink-muted' : '',
          aiThinking ? 'animate-pulse' : '',
        )}>
          {turnStatus}
        </div>

        <div className="flex-1" />

        {/* Board customizer */}
        <BoardCustomizeButton
          boardThemeId={boardThemeId}
          diceThemeId={diceThemeId}
          onBoard={chooseBoardTheme}
          onDice={chooseDiceTheme}
        />

        {/* Resign / reset */}
        <button
          onClick={() => setPhase('setup')}
          className="flex items-center justify-center gap-1.5 rounded-lg border border-line px-3 py-2 text-xs text-ink-subtle hover:text-loss hover:border-loss/30 transition-colors"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Resign &amp; restart
        </button>
      </aside>

      {/* ── Board + controls ── */}
      <div className="flex-1 min-w-0 flex flex-col gap-4 [@media(max-height:500px)]:gap-1.5">
        <div className="relative">
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
            suggestion={hint?.move ?? aiPreview}
          />

          <button
            type="button"
            onClick={toggleMute}
            aria-label={muted ? 'Unmute sounds' : 'Mute sounds'}
            className="absolute right-2 top-2 z-40 flex h-8 w-8 items-center justify-center rounded-full border border-line bg-surface-raised/90 text-ink-muted hover:text-gold"
          >
            {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>

          {/* "YOUR TURN!" pop-in overlay */}
          {showYourTurn && (
            <div
              className="pointer-events-none absolute inset-0 flex items-center justify-center z-50"
              style={{ animation: 'your-turn-pop 0.45s cubic-bezier(0.34,1.56,0.64,1) both' }}
            >
              <div className="flex flex-col items-center gap-1 rounded-2xl border-2 border-gold/60 bg-surface-canvas/88 backdrop-blur-sm px-8 py-5 shadow-[0_8px_40px_hsl(var(--gold)/0.35)]">
                <span className="text-4xl leading-none select-none">🎲</span>
                <p className="text-2xl font-black text-gold tracking-tight mt-1" style={{ textShadow: '0 0 20px hsl(var(--gold)/0.6)' }}>
                  YOUR TURN!
                </p>
                <p className="text-xs text-ink-muted">Tap a glowing checker to move</p>
              </div>
            </div>
          )}
        </div>

        {/* Hint callout — visual card */}
        {hint && (
          <div className="relative rounded-xl border border-gold/35 bg-gold/6 px-4 py-3 flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-gold/40 bg-gold/15 mt-0.5">
              <Lightbulb className="h-4 w-4 text-gold" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-gold">
                Best play: <span className="font-mono tracking-wide">{hint.notation}</span>
              </p>
              <p className="text-xs text-ink-muted mt-0.5 leading-relaxed">
                {hint.why} Follow the arrow on the board and tap the glowing checker.
              </p>
            </div>
          </div>
        )}

        {/* Action controls */}
        {game.currentPlayer === humanPlayer && (
          <div className="flex items-center gap-2 rounded-xl border border-line bg-surface-raised p-2">
            {game.dice && isHumanTurn && (
              <MovesCounter total={diceToPlay(game.dice).length} used={game.movesPlayed.length} />
            )}
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

            <Button
              onClick={showHint}
              variant="ghost"
              size="sm"
              disabled={!isHumanTurn || turnDone || noLegalMoves}
              className="gap-1.5 text-gold"
            >
              <Lightbulb className="h-4 w-4" />
              Hint
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
    </div>
    </div>
  )
}

// ─── Player side card ────────────────────────────────────────────────────────

function PlayerSideCard({
  name, sub, isActive, pips, icon,
}: {
  name:     string
  sub:      string
  isActive: boolean
  pips:     number
  icon:     'bot' | 'user'
}) {
  return (
    <div className={cn(
      'rounded-xl border px-3 py-2.5 flex items-center gap-2.5 transition-all',
      isActive ? 'border-gold/55 bg-gold/8 shadow-gold' : 'border-line bg-surface-raised opacity-60',
    )}>
      <div className={cn(
        'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
        isActive ? 'bg-gold/15' : 'bg-surface-elevated',
      )}>
        {icon === 'bot'
          ? <Bot className={cn('h-4 w-4', isActive ? 'text-gold' : 'text-ink-subtle')} />
          : <UserCircle2 className={cn('h-4 w-4', isActive ? 'text-gold' : 'text-ink-subtle')} />
        }
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-ink truncate">{name}</p>
        <p className="text-[10px] text-ink-muted">{sub}</p>
      </div>
      <div className="text-right shrink-0">
        <p className={cn('text-lg font-bold tabular-nums leading-none', isActive ? 'text-gold' : 'text-ink-muted')}>{pips}</p>
        <p className="text-[9px] text-ink-subtle">pips</p>
      </div>
    </div>
  )
}

// ─── Compact top bar (setup + gameover only) ─────────────────────────────────

function CompactTopBar({ currentUser }: { currentUser: SessionUser | null }) {
  return (
    <div className="mb-6 flex items-center justify-between gap-3">
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
          <Avatar name={currentUser.name} src={currentUser.avatarUrl ?? undefined} size="sm" />
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

function SetupRow({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2.5">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink-subtle">{label}</p>
        {hint && <p className="truncate text-[11px] text-ink-muted">{hint}</p>}
      </div>
      {children}
    </div>
  )
}

function Segmented({ value, onChange, options }: {
  value: string; onChange: (v: string) => void; options: { value: string; label: string }[]
}) {
  return (
    <div className="grid rounded-full border border-line bg-surface-raised p-1" style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }}>
      {options.map(o => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            'rounded-full py-2 text-sm font-semibold transition-all',
            value === o.value ? 'bg-gold text-surface-canvas shadow' : 'text-ink-muted hover:text-ink',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
