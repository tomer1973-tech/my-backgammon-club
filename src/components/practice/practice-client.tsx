'use client'

/**
 * PracticeClient — play backgammon against a heuristic AI opponent.
 *
 * Playing phase uses a sidebar layout: compact game info on the left,
 * board + controls on the right — keeping the full-height board prominent.
 */

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ChevronLeft, UserCircle2, Dices, Undo2, RotateCcw, Trophy, Bot, ArrowRight, Lightbulb, MessageCircle, Share2 } from 'lucide-react'
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
  const [game, setGame] = useState<GameState | null>(null)
  const [result, setResult] = useState<{ winner: Player; type: GameType } | null>(null)
  const [aiThinking, setAiThinking] = useState(false)

  const { boardThemeId, diceThemeId, boardTheme, diceTheme, chooseBoardTheme, chooseDiceTheme } = useBoardThemes()
  const [hint, setHint] = useState<Hint | null>(null)

  const aiPlayer = opponent(humanPlayer)

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
    return (
      <div className="animate-fade-in">
        <CompactTopBar currentUser={currentUser} />

        {/* Hero */}
        <div className="mb-8 text-center">
          <div className="mb-3 inline-flex h-16 w-16 items-center justify-center
            rounded-2xl bg-surface-raised border border-line shadow-gold text-4xl">
            🤖
          </div>
          <h1 className="font-display text-3xl font-bold text-ink tracking-tight">Practice vs AI</h1>
          <p className="mt-1.5 text-sm text-ink-muted">Sharpen your game against a computer opponent</p>
        </div>

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
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-green-700/40 bg-green-900/20 px-3 py-2 text-sm font-medium text-green-400 transition-colors hover:bg-green-900/35"
                >
                  <MessageCircle className="h-4 w-4" />
                  WhatsApp
                </button>
                <button
                  onClick={shareTwitter}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-sky-700/40 bg-sky-900/20 px-3 py-2 text-sm font-medium text-sky-400 transition-colors hover:bg-sky-900/35"
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
      <div className="mb-3 flex items-center gap-3 lg:hidden">
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
      <div className="flex-1 min-w-0 flex flex-col gap-4">
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
          suggestion={hint?.move ?? null}
        />

        {hint && (
          <div className="flex flex-col items-center gap-0.5 text-center px-2">
            <p className="flex items-center gap-1.5 text-sm font-semibold text-gold">
              <Lightbulb className="h-4 w-4" />
              Best play: <span className="font-mono tracking-wide">{hint.notation}</span>
            </p>
            <p className="text-xs text-ink-muted">
              {hint.why} Play the glowing checker to the gold dot.
            </p>
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
