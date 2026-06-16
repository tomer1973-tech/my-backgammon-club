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

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
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
  /** Highlight a recommended move (the "best move" hint). */
  suggestion?: Move | null
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
  boardTheme = BOARD_THEMES[0], diceTheme = DICE_THEMES[0], suggestion,
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

  // ── Checker glide animation ───────────────────────────────────────────────
  // When exactly one move is added, slide a ghost checker from the source cell
  // to where the moved checker now rests. The real checker at the destination
  // point is hidden for the duration so we don't briefly show two.
  const wrapRef       = useRef<HTMLDivElement>(null)
  const prevMovesRef  = useRef(movesPlayed.length)
  const animTimer     = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [anim, setAnim] = useState<
    | { fromX: number; fromY: number; toX: number; toY: number; player: Player; hidePoint: number | null; go: boolean }
    | null
  >(null)

  useLayoutEffect(() => {
    const prev = prevMovesRef.current
    prevMovesRef.current = movesPlayed.length
    if (movesPlayed.length !== prev + 1) return   // only animate single new moves
    const mv = movesPlayed[movesPlayed.length - 1]
    const wrap = wrapRef.current
    if (!wrap) return

    // Who moved? The destination point now holds the mover's checker.
    let mover: Player | null = null
    if (typeof mv.to === 'number') mover = board.points[mv.to] > 0 ? 'white' : board.points[mv.to] < 0 ? 'black' : null
    else if (typeof mv.from === 'number') mover = board.points[mv.from] > 0 ? 'white' : board.points[mv.from] < 0 ? 'black' : null
    if (!mover) return

    const fromKey = mv.from === 'bar' ? `bar-${mover}` : String(mv.from)
    const toKey   = mv.to   === 'off' ? `off-${mover}` : String(mv.to)

    const wr = wrap!.getBoundingClientRect()
    const fromEl = wrap!.querySelector(`[data-cell="${fromKey}"]`) as HTMLElement | null
    const toCell = wrap!.querySelector(`[data-cell="${toKey}"]`) as HTMLElement | null
    if (!fromEl || !toCell) return

    // Destination: land exactly on the moved checker (the last one at that point).
    const toChecker = mv.to === 'off'
      ? toCell
      : (toCell.querySelectorAll('[data-checker]')[toCell.querySelectorAll('[data-checker]').length - 1] as HTMLElement | null) ?? toCell
    const fr = fromEl.getBoundingClientRect()
    const tr = toChecker.getBoundingClientRect()
    const fromX = fr.left + fr.width / 2 - wr.left
    const fromY = fr.top + fr.height / 2 - wr.top
    const toX   = tr.left + tr.width / 2 - wr.left
    const toY   = tr.top + tr.height / 2 - wr.top

    if (animTimer.current) clearTimeout(animTimer.current)
    setAnim({ fromX, fromY, toX, toY, player: mover, hidePoint: typeof mv.to === 'number' ? mv.to : null, go: false })
    requestAnimationFrame(() => setAnim(a => (a ? { ...a, go: true } : a)))
    animTimer.current = setTimeout(() => setAnim(null), 400)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [movesPlayed.length])

  useEffect(() => () => { if (animTimer.current) clearTimeout(animTimer.current) }, [])

  const flip = perspective === 'black'
  const topOrder    = flip ? TOP_BLACK    : TOP_WHITE
  const bottomOrder = flip ? BOTTOM_BLACK : BOTTOM_WHITE

  const suggestFromPoint = suggestion && typeof suggestion.from === 'number' ? suggestion.from : null
  const suggestToPoint   = suggestion && typeof suggestion.to   === 'number' ? suggestion.to   : null

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
      ref={wrapRef}
      className={cn('relative flex flex-col gap-3 sm:flex-row sm:items-stretch', className)}
      style={themeVars(boardTheme, diceTheme)}
    >
      {/* Sliding ghost checker */}
      {anim && (
        <div
          className="pointer-events-none absolute z-30 h-[22px] w-[22px] rounded-full border sm:h-7 sm:w-7"
          style={{
            left: anim.toX,
            top:  anim.toY,
            ...CHECKER_STYLE[anim.player],
            transform: `translate(-50%, -50%) translate(${anim.go ? 0 : anim.fromX - anim.toX}px, ${anim.go ? 0 : anim.fromY - anim.toY}px)`,
            transition: anim.go ? 'transform 380ms cubic-bezier(0.22, 1, 0.36, 1)' : 'none',
          }}
        />
      )}

      {/* ── Board ── */}
      <div
        className="flex-1 rounded-2xl p-2 sm:p-3"
        style={{
          backgroundColor: 'var(--bg-felt)',
          border: '8px solid var(--bg-rail)',
          boxShadow: [
            'inset 0 0 0 1.5px hsl(40 60% 52% / 0.22)',   // gold hairline frame
            'inset 0 3px 20px rgba(0,0,0,0.6)',           // felt depth
            '0 10px 30px rgba(0,0,0,0.45)',               // lift off the page
          ].join(', '),
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
          hidePoint={anim?.hidePoint ?? null}
          suggestFromPoint={suggestFromPoint}
          suggestToPoint={suggestToPoint}
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
          hidePoint={anim?.hidePoint ?? null}
          suggestFromPoint={suggestFromPoint}
          suggestToPoint={suggestToPoint}
        />
      </div>

      {/* ── Side panel: bear-off trays + dice ── */}
      <div className="flex shrink-0 flex-row gap-2 sm:w-28 sm:flex-col">
        <BearOffTray player={flip ? 'black' : 'white'} board={board}
          highlighted={toOptions.has('off')}
          onClick={() => handleClick('off')} />
        <div
          className="flex flex-1 items-center justify-center rounded-xl p-2"
          style={{
            backgroundColor: 'var(--bg-felt)',
            border: '5px solid var(--bg-rail)',
            boxShadow: 'inset 0 0 0 1px hsl(40 60% 52% / 0.18), inset 0 2px 8px rgba(0,0,0,0.5)',
          }}
        >
          {dice ? (
            // Keyed on the roll so the roll-in animation plays once per new roll,
            // not on every checker move within the turn.
            <div key={dice.join('-')} className="flex flex-wrap items-center justify-center gap-1.5">
              {diceState.map((d, i) => (
                <Die key={i} value={d.value} used={d.used} delay={i * 70} />
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
  order, rowPosition, board, selected, fromOptions, toOptions, onClick, hidePoint,
  suggestFromPoint, suggestToPoint,
}: {
  order: (number | 'bar')[]
  rowPosition: 'top' | 'bottom'
  board: Board
  selected: Highlight | null
  fromOptions: Set<Highlight>
  toOptions: Map<Highlight, Move>
  onClick: (target: Highlight) => void
  hidePoint: number | null
  suggestFromPoint: number | null
  suggestToPoint: number | null
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
            isSource={fromOptions.has(entry)}
            isTarget={toOptions.has(entry)}
            onClick={() => onClick(entry)}
            hideTop={hidePoint === entry}
            suggestFrom={suggestFromPoint === entry}
            suggestTo={suggestToPoint === entry}
          />
        )
      })}
    </div>
  )
}

// ─── A single triangular point ─────────────────────────────────────────────

function PointCell({
  index, rowPosition, count, player, selected, isSource, isTarget, onClick, hideTop,
  suggestFrom, suggestTo,
}: {
  index: number
  rowPosition: 'top' | 'bottom'
  count: number
  player: Player | null
  selected: boolean
  isSource: boolean
  isTarget: boolean
  onClick: () => void
  hideTop?: boolean
  suggestFrom?: boolean
  suggestTo?: boolean
}) {
  const dark = index % 2 === 0
  const clipPath = rowPosition === 'top'
    ? 'polygon(0% 0%, 100% 0%, 50% 100%)'
    : 'polygon(0% 100%, 100% 100%, 50% 0%)'

  // Solid triangle, lit at the wide base and darkening toward the tip.
  const base = dark ? 'var(--bg-point-dark)' : 'var(--bg-point-light)'
  const lit  = `color-mix(in srgb, ${base} 84%, white)`
  const tip  = `color-mix(in srgb, ${base} 64%, black)`
  const gradient = rowPosition === 'top'
    ? `linear-gradient(to bottom, ${lit}, ${base} 40%, ${tip})`
    : `linear-gradient(to top, ${lit}, ${base} 40%, ${tip})`

  const interactive = isSource || isTarget || selected
  const goldFill = interactive || suggestFrom
  const stack = Math.max(0, Math.min(count, MAX_STACK) - (hideTop ? 1 : 0))

  return (
    <button
      type="button"
      data-cell={index}
      onClick={onClick}
      aria-label={`Point ${index + 1}${count ? `, ${count} ${player} checker${count === 1 ? '' : 's'}` : ', empty'}`}
      className={cn(
        'relative flex h-36 sm:h-44 flex-col items-center gap-0.5 px-0.5 outline-none',
        rowPosition === 'top' ? 'justify-start pt-1.5' : 'flex-col-reverse justify-start pb-1.5',
        interactive ? 'cursor-pointer' : 'cursor-default',
      )}
    >
      {/* Triangle: themed gradient normally; gold when interactive / suggested. */}
      <div
        className={cn(
          'absolute inset-0',
          selected && 'bg-gold/45',
          isTarget && !selected && 'bg-gold/30',
          suggestFrom && !selected && 'bg-gold/40 animate-pulse',
          isSource && !suggestFrom && !selected && 'bg-gold/15',
        )}
        style={goldFill ? { clipPath } : { clipPath, backgroundImage: gradient }}
      />

      {/* Checkers (centered on the point). The pickable / suggested top checker glows. */}
      {Array.from({ length: stack }).map((_, i) => (
        <Checker
          key={i}
          player={player!}
          overflowCount={i === MAX_STACK - 1 && count > MAX_STACK ? count : undefined}
          glow={(isSource || suggestFrom) && i === stack - 1}
        />
      ))}

      {/* Drop-here indicator for a legal destination. */}
      {isTarget && !suggestTo && (
        <span
          className={cn(
            'pointer-events-none absolute left-1/2 z-10 -translate-x-1/2 h-6 w-6 rounded-full',
            'border-2 border-gold bg-gold/25 animate-pulse',
            rowPosition === 'top' ? 'top-2' : 'bottom-2',
          )}
        />
      )}

      {/* Best-move destination marker (solid gold + expanding ring). */}
      {suggestTo && (
        <span className={cn(
          'pointer-events-none absolute left-1/2 z-20 -translate-x-1/2',
          rowPosition === 'top' ? 'top-2' : 'bottom-2',
        )}>
          <span className="relative flex h-5 w-5">
            <span className="absolute inline-flex h-full w-full rounded-full bg-gold opacity-70 animate-ping" />
            <span className="relative inline-flex h-5 w-5 rounded-full border-2 border-surface-base bg-gold" />
          </span>
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
      data-cell={`bar-${player}`}
      onClick={onClick}
      aria-label={`Bar${count ? `, ${count} ${player} checker${count === 1 ? '' : 's'} waiting to enter` : ''}`}
      className={cn(
        'relative flex h-36 sm:h-44 flex-col items-center gap-0.5 rounded-md px-0.5',
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
      data-cell={`off-${player}`}
      onClick={onClick}
      aria-label={`${player} borne off: ${count} of ${CHECKERS_PER_PLAYER}`}
      className={cn(
        'flex flex-1 flex-col items-center justify-center gap-1 rounded-xl p-2 sm:p-3 transition-colors',
        highlighted && 'cursor-pointer',
      )}
      style={highlighted
        ? { backgroundColor: 'hsl(40 62% 55% / 0.12)', border: '5px solid hsl(40 62% 55% / 0.6)' }
        : { backgroundColor: 'var(--bg-felt)', border: '5px solid var(--bg-rail)', boxShadow: 'inset 0 0 0 1px hsl(40 60% 52% / 0.18), inset 0 2px 8px rgba(0,0,0,0.5)' }}
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
    backgroundImage: 'radial-gradient(circle at 36% 28%, hsl(44 50% 99%), hsl(40 32% 86%) 60%, hsl(36 24% 72%) 100%)',
    borderColor: 'hsl(38 24% 60%)',
    boxShadow: 'inset 0 1.5px 2px rgba(255,255,255,0.85), inset 0 -3px 4px rgba(110,88,52,0.3), 0 3px 5px rgba(0,0,0,0.5)',
  },
  black: {
    backgroundImage: 'radial-gradient(circle at 36% 28%, hsl(30 18% 30%), hsl(26 26% 12%) 58%, hsl(24 30% 6%) 100%)',
    borderColor: 'hsl(40 55% 48% / 0.55)',
    boxShadow: 'inset 0 1.5px 2px rgba(255,255,255,0.22), inset 0 -3px 4px rgba(0,0,0,0.6), 0 3px 5px rgba(0,0,0,0.6)',
  },
}

// Concentric ring detail (the engraved circle on a real checker).
const CHECKER_RING: Record<Player, string> = {
  white: 'hsl(38 26% 58% / 0.55)',
  black: 'hsl(42 60% 55% / 0.45)',
}

function Checker({ player, overflowCount, small, glow }: { player: Player; overflowCount?: number; small?: boolean; glow?: boolean }) {
  const style = glow
    ? { ...CHECKER_STYLE[player], boxShadow: `${CHECKER_STYLE[player].boxShadow}, 0 0 0 2px hsl(40 85% 60%), 0 0 10px hsl(40 85% 60% / 0.75)` }
    : CHECKER_STYLE[player]
  return (
    <div
      data-checker=""
      className={cn(
        'relative shrink-0 rounded-full border',
        small ? 'h-5 w-5' : 'h-[22px] w-[22px] sm:h-7 sm:w-7',
      )}
      style={style}
    >
      {/* engraved concentric ring */}
      <span
        className="pointer-events-none absolute inset-[20%] rounded-full"
        style={{ boxShadow: `0 0 0 1px ${CHECKER_RING[player]}, inset 0 0 0 1px ${CHECKER_RING[player]}` }}
      />
      {overflowCount !== undefined && (
        <span className={cn(
          'absolute inset-0 z-10 flex items-center justify-center text-[10px] font-bold',
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

function Die({ value, used, delay = 0 }: { value: number; used: boolean; delay?: number }) {
  return (
    <div
      className={cn(
        'grid h-10 w-10 grid-cols-3 grid-rows-3 gap-[2px] rounded-[26%] border p-[5px] animate-dice-in',
        used ? 'border-line bg-surface-elevated opacity-40' : '',
      )}
      style={used ? { animationDelay: `${delay}ms`, animationFillMode: 'backwards' } : {
        animationDelay: `${delay}ms`,
        animationFillMode: 'backwards',
        // die face + soft top gloss baked into the background
        backgroundColor: 'var(--die-bg)',
        backgroundImage: 'linear-gradient(155deg, rgba(255,255,255,0.45), rgba(255,255,255,0) 48%)',
        borderColor: 'var(--die-border)',
        boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.55), inset 0 -2px 3px rgba(0,0,0,0.18), 0 3px 7px rgba(0,0,0,0.5)',
      }}
    >
      {Array.from({ length: 9 }).map((_, i) => {
        const row = Math.floor(i / 3)
        const col = i % 3
        const hasPip = PIP_LAYOUTS[value]?.some(([r, c]) => r === row && c === col)
        return (
          <span
            key={i}
            className={cn('place-self-center h-[5px] w-[5px] rounded-full', hasPip && used && 'bg-ink-subtle')}
            style={hasPip && !used ? {
              backgroundColor: 'var(--die-pip)',
              boxShadow: 'inset 0 0.5px 1px rgba(0,0,0,0.5), 0 0.5px 0 rgba(255,255,255,0.2)',
            } : undefined}
          />
        )
      })}
    </div>
  )
}

// ─── Moves counter (exported for use in game clients) ────────────────────────

/**
 * Shows how many die-moves are left this turn.
 * Pass `total` = diceToPlay(dice).length, `used` = movesPlayed.length.
 */
export function MovesCounter({ total, used }: { total: number; used: number }) {
  if (total === 0) return null
  const remaining = total - used
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          className={cn(
            'inline-flex h-4 w-4 rounded-full border',
            i < used
              ? 'border-line bg-surface-elevated opacity-35'
              : 'border-gold bg-gold/20',
          )}
        />
      ))}
      <span className="text-[11px] text-ink-muted">
        {remaining === 0 ? 'done' : `${remaining} left`}
      </span>
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
