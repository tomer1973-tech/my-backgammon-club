'use client'

/**
 * BackgammonBoard — interactive board UI.
 *
 * Pure presentation + click-to-move interaction layer over the engine in
 * `@/lib/backgammon`. The caller owns all game state (board, dice, whose
 * turn it is, the legal sequences for the current roll, and the moves
 * already played this turn) — this component only renders that state and
 * reports completed move choices via `onMove`.
 *
 * Move selection works by "prefix matching": given `legalSequences` (every
 * maximal-length legal sequence for the current dice) and `movesPlayed`
 * (the moves chosen so far this turn), the set of legal *next* moves is
 * every `seq.moves[movesPlayed.length]` for sequences whose prefix matches
 * `movesPlayed`. Tapping a checker selects a `from` with at least one such
 * move; tapping a highlighted destination calls `onMove` with that move.
 */

import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { cn } from '@/lib/utils'
import {
  isSequencePrefix,
  diceToPlay,
  type Board,
  type Move,
  type MoveSequence,
  type Player,
  type Dice,
  type CubeState,
} from '@/lib/backgammon'
import { BOARD_THEMES, DICE_THEMES, themeVars, type BoardTheme, type DiceTheme } from '@/lib/backgammon/themes'

interface BackgammonBoardProps {
  board: Board
  /** Player whose home board (points 1-6 / 19-24) is shown bottom-right. */
  perspective: Player
  /** Player to move this turn. Move selection is disabled if this isn't set. */
  toMove?: Player | null
  dice?: Dice | null
  /** Every maximal legal sequence for `toMove`'s current roll. */
  legalSequences?: MoveSequence[]
  /** Moves already chosen this turn (a prefix of one or more `legalSequences`). */
  movesPlayed?: Move[]
  /** Called when the player taps a highlighted destination, completing a legal move. */
  onMove?: (move: Move) => void
  cube?: CubeState | null
  /** Disable all interaction (e.g. opponent's turn, game over). */
  disabled?: boolean
  className?: string
  /** Board colour theme (felt + triangles). Defaults to Classic. */
  boardTheme?: BoardTheme
  /** Dice colour theme. Defaults to Ivory. */
  diceTheme?: DiceTheme
}

const CHECKERS_PER_PLAYER = 15
const MAX_STACK = 5

// ─── Board layout ───────────────────────────────────────────────────────────
//
// 13-column grid: 6 points | bar | 6 points, x2 rows.
// Entries are point indices (0-23) or 'bar'. Defined for the 'white'
// perspective (white's home, indices 0-5, sits bottom-right); the 'black'
// perspective is the 180° rotation.

const TOP_WHITE:    (number | 'bar')[] = [12, 13, 14, 15, 16, 17, 'bar', 18, 19, 20, 21, 22, 23]
const BOTTOM_WHITE: (number | 'bar')[] = [11, 10, 9, 8, 7, 6, 'bar', 5, 4, 3, 2, 1, 0]
const TOP_BLACK:    (number | 'bar')[] = [0, 1, 2, 3, 4, 5, 'bar', 6, 7, 8, 9, 10, 11]
const BOTTOM_BLACK: (number | 'bar')[] = [23, 22, 21, 20, 19, 18, 'bar', 17, 16, 15, 14, 13, 12]

type Highlight = number | 'bar' | 'off'

export function BackgammonBoard({
  board, perspective, toMove, dice, legalSequences = [], movesPlayed = [],
  onMove, cube, disabled, className,
  boardTheme = BOARD_THEMES[0], diceTheme = DICE_THEMES[0],
}: BackgammonBoardProps) {
  const [selected, setSelected] = useState<Highlight | null>(null)

  // Reset selection whenever the board or move count changes (a move was
  // played, or it's a new turn).
  useEffect(() => {
    setSelected(null)
  }, [board, movesPlayed.length])

  const interactive = !disabled && !!toMove && !!onMove

  // ── Compute legal "next moves" from the prefix of moves played so far ──
  const nextMoves = useMemo(() => {
    if (!interactive) return []
    const moves: Move[] = []
    const seen = new Set<string>()
    for (const seq of legalSequences) {
      if (seq.moves.length <= movesPlayed.length) continue
      if (!isSequencePrefix(movesPlayed, seq.moves)) continue
      const next = seq.moves[movesPlayed.length]
      const key = `${next.from}-${next.to}-${next.die}`
      if (seen.has(key)) continue
      seen.add(key)
      moves.push(next)
    }
    return moves
  }, [interactive, legalSequences, movesPlayed])

  const fromOptions = useMemo(() => {
    const set = new Set<Highlight>()
    for (const m of nextMoves) set.add(m.from)
    return set
  }, [nextMoves])

  const toOptions = useMemo(() => {
    if (selected === null) return new Map<Highlight, Move>()
    const map = new Map<Highlight, Move>()
    for (const m of nextMoves) {
      if (m.from === selected) map.set(m.to, m)
    }
    return map
  }, [nextMoves, selected])

  function handleClick(target: Highlight) {
    if (!interactive) return

    if (selected !== null) {
      const move = toOptions.get(target)
      if (move) {
        onMove!(move)
        setSelected(null)
        return
      }
      if (target === selected) {
        setSelected(null)
        return
      }
    }

    if (fromOptions.has(target)) {
      setSelected(target)
    } else {
      setSelected(null)
    }
  }

  const flip = perspective === 'black'
  const topOrder    = flip ? TOP_BLACK    : TOP_WHITE
  const bottomOrder = flip ? BOTTOM_BLACK : BOTTOM_WHITE

  const usedDice = movesPlayed.map(m => m.die)
  const diceFaces = dice ? diceToPlay(dice) : []
  // Mark one occurrence of each used die value as consumed.
  const remaining = [...usedDice]
  const diceState = diceFaces.map(value => {
    const i = remaining.indexOf(value)
    if (i >= 0) {
      remaining.splice(i, 1)
      return { value, used: true }
    }
    return { value, used: false }
  })

  return (
    <div
      className={cn('flex flex-col gap-3 sm:flex-row sm:items-stretch', className)}
      style={themeVars(boardTheme, diceTheme)}
    >
      {/* ── Board ── */}
      <div
        className="flex-1 rounded-2xl p-2 sm:p-3"
        style={{
          backgroundColor: 'var(--bg-felt)',
          border: '7px solid var(--bg-rail)',
          boxShadow: 'inset 0 2px 14px rgba(0,0,0,0.55), 0 1px 0 rgba(255,255,255,0.03)',
        }}
      >
        <BoardRow
          order={topOrder}
          rowPosition="top"
          board={board}
          selected={selected}
          fromOptions={fromOptions}
          toOptions={toOptions}
          onClick={handleClick}
        />
        <div className="my-1 flex items-center justify-center gap-2">
          {cube && <CubeBadge cube={cube} />}
        </div>
        <BoardRow
          order={bottomOrder}
          rowPosition="bottom"
          board={board}
          selected={selected}
          fromOptions={fromOptions}
          toOptions={toOptions}
          onClick={handleClick}
        />
      </div>

      {/* ── Side panel: bear-off trays + dice ── */}
      <div className="flex shrink-0 flex-row gap-2 sm:w-28 sm:flex-col">
        <BearOffTray player={flip ? 'black' : 'white'} board={board}
          highlighted={toOptions.has('off')}
          onClick={() => handleClick('off')} />
        <div
          className="flex flex-1 items-center justify-center rounded-xl p-2"
          style={{ backgroundColor: 'var(--bg-felt)', border: '4px solid var(--bg-rail)' }}
        >
          {dice ? (
            <div className="flex flex-wrap items-center justify-center gap-1.5">
              {diceState.map((d, i) => (
                <Die key={i} value={d.value} used={d.used} />
              ))}
            </div>
          ) : (
            <span className="text-xs text-ink-subtle">—</span>
          )}
        </div>
        <BearOffTray player={flip ? 'white' : 'black'} board={board}
          highlighted={toOptions.has('off')}
          onClick={() => handleClick('off')} />
      </div>
    </div>
  )
}

// ─── Board row (6 points | bar | 6 points) ─────────────────────────────────

function BoardRow({
  order, rowPosition, board, selected, fromOptions, toOptions, onClick,
}: {
  order: (number | 'bar')[]
  rowPosition: 'top' | 'bottom'
  board: Board
  selected: Highlight | null
  fromOptions: Set<Highlight>
  toOptions: Map<Highlight, Move>
  onClick: (target: Highlight) => void
}) {
  return (
    <div className="grid grid-cols-[repeat(6,1fr)_0.6fr_repeat(6,1fr)] gap-1">
      {order.map((entry, i) => {
        if (entry === 'bar') {
          return (
            <BarCell
              key="bar"
              rowPosition={rowPosition}
              board={board}
              selected={selected}
              highlighted={fromOptions.has('bar') || toOptions.has('bar')}
              onClick={() => onClick('bar')}
            />
          )
        }
        const count = board.points[entry]
        const player: Player | null = count > 0 ? 'white' : count < 0 ? 'black' : null
        return (
          <PointCell
            key={entry}
            index={entry}
            rowPosition={rowPosition}
            count={Math.abs(count)}
            player={player}
            selected={selected === entry}
            highlighted={fromOptions.has(entry) || toOptions.has(entry)}
            onClick={() => onClick(entry)}
          />
        )
      })}
    </div>
  )
}

// ─── A single triangular point ─────────────────────────────────────────────

function PointCell({
  index, rowPosition, count, player, selected, highlighted, onClick,
}: {
  index: number
  rowPosition: 'top' | 'bottom'
  count: number
  player: Player | null
  selected: boolean
  highlighted: boolean
  onClick: () => void
}) {
  const dark = index % 2 === 0
  const clipPath = rowPosition === 'top'
    ? 'polygon(0% 0%, 100% 0%, 50% 100%)'
    : 'polygon(0% 100%, 100% 100%, 50% 0%)'

  // Tapered gradient: saturated at the wide base, fading toward the pointed tip.
  const base = dark ? 'var(--bg-point-dark)' : 'var(--bg-point-light)'
  const gradient = rowPosition === 'top'
    ? `linear-gradient(to bottom, ${base} 0%, ${base} 18%, color-mix(in srgb, ${base} 25%, transparent) 92%, transparent 100%)`
    : `linear-gradient(to top, ${base} 0%, ${base} 18%, color-mix(in srgb, ${base} 25%, transparent) 92%, transparent 100%)`

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Point ${index + 1}${count ? `, ${count} ${player} checker${count === 1 ? '' : 's'}` : ', empty'}`}
      className={cn(
        'relative flex h-32 sm:h-36 flex-col gap-0.5 px-0.5 outline-none',
        rowPosition === 'top' ? 'justify-start pt-1' : 'flex-col-reverse justify-start pb-1',
        highlighted && 'cursor-pointer',
        !highlighted && 'cursor-default',
      )}
    >
      <div
        className={cn(
          'absolute inset-0',
          highlighted && 'bg-gold/25',
          selected && 'bg-gold/40',
        )}
        style={{
          clipPath,
          // Themed tapered fill; let the gold classes win when highlighted/selected.
          ...(highlighted || selected ? {} : { backgroundImage: gradient }),
        }}
      />
      {Array.from({ length: Math.min(count, MAX_STACK) }).map((_, i) => (
        <Checker
          key={i}
          player={player!}
          overflowCount={i === MAX_STACK - 1 && count > MAX_STACK ? count : undefined}
        />
      ))}
      {selected && (
        <span className="pointer-events-none absolute inset-x-0 top-1/2 z-10 -translate-y-1/2 text-center text-[10px] font-bold uppercase tracking-wider text-gold">
          •
        </span>
      )}
    </button>
  )
}

// ─── Bar cell ────────────────────────────────────────────────────────────────

function BarCell({
  rowPosition, board, selected, highlighted, onClick,
}: {
  rowPosition: 'top' | 'bottom'
  board: Board
  selected: Highlight | null
  highlighted: boolean
  onClick: () => void
}) {
  // White's bar checkers shown in the top half, black's in the bottom half.
  const player: Player = rowPosition === 'top' ? 'white' : 'black'
  const count = board.bar[player]

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Bar${count ? `, ${count} ${player} checker${count === 1 ? '' : 's'} waiting to enter` : ''}`}
      className={cn(
        'relative flex h-32 sm:h-36 flex-col items-center gap-0.5 rounded-md px-0.5',
        rowPosition === 'top' ? 'justify-start pt-1' : 'flex-col-reverse justify-start pb-1',
        highlighted && 'cursor-pointer bg-gold/20',
        selected === 'bar' && 'bg-gold/35',
      )}
      style={highlighted || selected === 'bar' ? undefined : {
        backgroundColor: 'var(--bg-rail)',
        boxShadow: 'inset 1px 0 2px rgba(0,0,0,0.4), inset -1px 0 2px rgba(0,0,0,0.4)',
      }}
    >
      {Array.from({ length: Math.min(count, MAX_STACK) }).map((_, i) => (
        <Checker key={i} player={player} overflowCount={i === MAX_STACK - 1 && count > MAX_STACK ? count : undefined} />
      ))}
    </button>
  )
}

// ─── Bear-off tray ───────────────────────────────────────────────────────────

function BearOffTray({
  player, board, highlighted, onClick,
}: {
  player: Player
  board: Board
  highlighted: boolean
  onClick: () => void
}) {
  const count = board.borneOff[player]
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${player} borne off: ${count} of ${CHECKERS_PER_PLAYER}`}
      className={cn(
        'flex flex-1 flex-col items-center justify-center gap-1 rounded-xl p-2 sm:p-3 transition-colors',
        highlighted && 'cursor-pointer',
      )}
      style={highlighted
        ? { backgroundColor: 'hsl(40 62% 55% / 0.12)', border: '4px solid hsl(40 62% 55% / 0.6)' }
        : { backgroundColor: 'var(--bg-felt)', border: '4px solid var(--bg-rail)' }}
    >
      <Checker player={player} small />
      <span className="text-xs font-semibold tabular-nums text-ink">
        {count}/{CHECKERS_PER_PLAYER}
      </span>
    </button>
  )
}

// ─── Checker ─────────────────────────────────────────────────────────────────

const CHECKER_STYLE: Record<Player, CSSProperties> = {
  white: {
    backgroundImage: 'radial-gradient(circle at 38% 30%, hsl(42 45% 98%), hsl(40 30% 85%) 68%, hsl(38 26% 76%) 100%)',
    borderColor: 'hsl(40 22% 66%)',
    boxShadow: 'inset 0 1px 1.5px rgba(255,255,255,0.7), inset 0 -2px 3px rgba(120,100,60,0.25), 0 2px 3px rgba(0,0,0,0.45)',
  },
  black: {
    backgroundImage: 'radial-gradient(circle at 38% 30%, hsl(28 16% 27%), hsl(26 24% 11%) 66%, hsl(25 28% 7%) 100%)',
    borderColor: 'hsl(40 55% 50% / 0.5)',
    boxShadow: 'inset 0 1px 1.5px rgba(255,255,255,0.18), inset 0 -2px 3px rgba(0,0,0,0.5), 0 2px 3px rgba(0,0,0,0.55)',
  },
}

function Checker({ player, overflowCount, small }: { player: Player; overflowCount?: number; small?: boolean }) {
  return (
    <div
      className={cn(
        'relative shrink-0 rounded-full border',
        small ? 'h-5 w-5' : 'h-[22px] w-[22px] sm:h-7 sm:w-7',
      )}
      style={CHECKER_STYLE[player]}
    >
      {overflowCount !== undefined && (
        <span className={cn(
          'absolute inset-0 flex items-center justify-center text-[10px] font-bold',
          player === 'white' ? 'text-[hsl(25,25%,22%)]' : 'text-gold',
        )}>
          {overflowCount}
        </span>
      )}
    </div>
  )
}

// ─── Dice ────────────────────────────────────────────────────────────────────

const PIP_LAYOUTS: Record<number, [number, number][]> = {
  1: [[1, 1]],
  2: [[0, 0], [2, 2]],
  3: [[0, 0], [1, 1], [2, 2]],
  4: [[0, 0], [0, 2], [2, 0], [2, 2]],
  5: [[0, 0], [0, 2], [1, 1], [2, 0], [2, 2]],
  6: [[0, 0], [0, 2], [1, 0], [1, 2], [2, 0], [2, 2]],
}

function Die({ value, used }: { value: number; used: boolean }) {
  return (
    <div
      className={cn(
        'grid h-9 w-9 grid-cols-3 grid-rows-3 gap-[3px] rounded-lg border p-1.5',
        used ? 'border-line bg-surface-elevated opacity-40' : '',
      )}
      style={used ? undefined : {
        backgroundColor: 'var(--die-bg)',
        borderColor: 'var(--die-border)',
        boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.4), 0 2px 5px rgba(0,0,0,0.45)',
      }}
    >
      {Array.from({ length: 9 }).map((_, i) => {
        const row = Math.floor(i / 3)
        const col = i % 3
        const hasPip = PIP_LAYOUTS[value]?.some(([r, c]) => r === row && c === col)
        return (
          <span
            key={i}
            className={cn('rounded-full', hasPip && used && 'bg-ink-subtle')}
            style={hasPip && !used ? { backgroundColor: 'var(--die-pip)' } : undefined}
          />
        )
      })}
    </div>
  )
}

// ─── Doubling cube ───────────────────────────────────────────────────────────

function CubeBadge({ cube }: { cube: CubeState }) {
  return (
    <div className="flex h-8 w-8 items-center justify-center rounded-md border border-gold/50 bg-surface-elevated text-xs font-bold text-gold shadow-sm">
      {cube.value}
    </div>
  )
}
