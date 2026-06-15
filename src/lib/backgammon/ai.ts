/**
 * Backgammon engine — heuristic AI opponent.
 *
 * A simple 0-ply evaluator: for each legal move sequence, apply it and
 * score the resulting position from the AI's point of view. Higher is
 * better for the AI. `chooseAIMove` picks the highest-scoring sequence,
 * with random noise added at lower difficulties so the bot isn't
 * perfectly optimal.
 */

import type { Board, Player, Dice, Move, MoveSequence } from './types'
import {
  HOME_RANGE, opponent, checkerCountAt, isBlotAt, pipCount,
} from './board'
import { getLegalSequences, isSequencePrefix } from './moves'

export type Difficulty = 'easy' | 'medium' | 'hard'

const NOISE: Record<Difficulty, number> = {
  easy:   40,
  medium: 12,
  hard:   0,
}

/** Bonus for a made point (2+ checkers), by board region. */
function pointValue(idx: number, player: Player): number {
  const [homeStart, homeEnd] = HOME_RANGE[player]
  if (idx >= homeStart && idx <= homeEnd) return 3   // home board point
  const barPoint = player === 'white' ? 6 : 17       // 7-point / bar point
  if (idx === barPoint) return 2.5
  return 1.5
}

/** Index `from` lands on after stepping one `die` toward decreasing pip-distance, for `player`. */
function step(player: Player, from: number, die: number): number {
  return player === 'white' ? from - die : from + die
}

/**
 * True if `opp` can move a checker through to `idx` along `path` (a sequence
 * of die values), with every intermediate point open for `opp`.
 * Assumes a checker of `opp` already sits at the path's starting point.
 */
function pathOpen(board: Board, opp: Player, src: number, path: number[]): boolean {
  let pos = src
  for (let i = 0; i < path.length - 1; i++) {
    pos = step(opp, pos, path[i])
    if (pos < 0 || pos > 23) return false
    if (!isPointOpenFor(board, opp, pos)) return false
  }
  return true
}

function isPointOpenFor(board: Board, player: Player, idx: number): boolean {
  const v = board.points[idx]
  return player === 'white' ? v >= -1 : v <= 1
}

/**
 * Out of the 36 equally-likely dice rolls, how many let `opp` hit a blot of
 * `player` sitting at `idx`. Ignores `opp`'s bar (a small overestimate of
 * risk when `opp` has checkers on the bar).
 */
function shotsAt(board: Board, opp: Player, idx: number): number {
  let hits = 0
  for (let a = 1; a <= 6; a++) {
    for (let b = 1; b <= 6; b++) {
      const distances: number[] = a === b ? [a, 2 * a, 3 * a, 4 * a] : [a, b, a + b]
      let canHit = false
      for (const d of distances) {
        if (d > 24) continue
        const src = opp === 'white' ? idx + d : idx - d
        if (src < 0 || src > 23) continue
        if (checkerCountAt(board, opp, src) === 0) continue
        if (d <= 6) { canHit = true; break }
        // Combination shot — need an open intermediate point.
        if (a === b) {
          if (pathOpen(board, opp, src, new Array(d / a).fill(a))) { canHit = true; break }
        } else if (pathOpen(board, opp, src, [a, b]) || pathOpen(board, opp, src, [b, a])) {
          canHit = true; break
        }
      }
      if (canHit) hits++
    }
  }
  return hits
}

/** Score `board` from `player`'s perspective. Higher = better for `player`. */
export function evaluateBoard(board: Board, player: Player): number {
  const opp = opponent(player)
  let score = 0

  // Race: being ahead on pips is good.
  score += (pipCount(board, opp) - pipCount(board, player)) * 2

  // Checkers on the bar are very costly.
  score -= board.bar[player] * 20
  score += board.bar[opp] * 20

  // Borne-off checkers are progress toward winning.
  score += board.borneOff[player] * 10
  score -= board.borneOff[opp] * 10

  for (let i = 0; i < 24; i++) {
    if (checkerCountAt(board, player, i) >= 2) {
      score += pointValue(i, player)
    }
    if (checkerCountAt(board, opp, i) >= 2) {
      score -= pointValue(i, opp)
    }

    if (isBlotAt(board, player, i)) {
      const pipsLostIfHit = 25 - (player === 'white' ? i + 1 : 24 - i)
      score -= (shotsAt(board, opp, i) / 36) * pipsLostIfHit * 1.5
    }
    if (isBlotAt(board, opp, i)) {
      const pipsLostIfHit = 25 - (opp === 'white' ? i + 1 : 24 - i)
      score += (shotsAt(board, player, i) / 36) * pipsLostIfHit * 1.5
    }
  }

  return score
}

/**
 * Pick a move sequence for `player` given `dice`, at the given difficulty.
 * If the player has no legal moves, the returned sequence has empty `moves`.
 */
export function chooseAIMove(board: Board, player: Player, dice: Dice, difficulty: Difficulty): MoveSequence {
  const sequences = getLegalSequences(board, player, dice)
  if (sequences.length === 1) return sequences[0]

  const noise = NOISE[difficulty]
  let best = sequences[0]
  let bestScore = -Infinity

  for (const seq of sequences) {
    const score = evaluateBoard(seq.board, player) + (noise > 0 ? (Math.random() - 0.5) * noise : 0)
    if (score > bestScore) {
      bestScore = score
      best = seq
    }
  }

  return best
}

/**
 * Hint helper — the single best *next* move for `player` from the position at
 * the start of the turn, given the dice and the moves already played this turn.
 *
 * It finds the highest-scoring full legal sequence that continues `movesPlayed`
 * as a prefix, then returns the next move in that line (deterministic, no noise).
 * Returns `null` when no further move is possible.
 */
export function bestNextMove(
  turnStartBoard: Board,
  player: Player,
  dice: Dice,
  movesPlayed: Move[],
): Move | null {
  const sequences = getLegalSequences(turnStartBoard, player, dice)
  const matching = sequences.filter(
    s => s.moves.length > movesPlayed.length && isSequencePrefix(movesPlayed, s.moves),
  )
  if (matching.length === 0) return null

  let best = matching[0]
  let bestScore = evaluateBoard(best.board, player)
  for (const seq of matching) {
    const score = evaluateBoard(seq.board, player)
    if (score > bestScore) { bestScore = score; best = seq }
  }
  return best.moves[movesPlayed.length]
}
