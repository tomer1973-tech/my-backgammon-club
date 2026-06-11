/**
 * Backgammon engine — board setup & queries.
 * See types.ts for the board representation convention.
 */

import type { Board, Player, Points, GameType } from './types'

/** Home board index ranges (inclusive) for each player. */
export const HOME_RANGE: Record<Player, [number, number]> = {
  white: [0, 5],   // points 1-6
  black: [18, 23], // points 19-24
}

export function opponent(player: Player): Player {
  return player === 'white' ? 'black' : 'white'
}

/** Standard backgammon starting position. */
export function createInitialBoard(): Board {
  const points: Points = new Array(24).fill(0)

  // White (positive)
  points[23] = 2  // point 24
  points[12] = 5  // point 13
  points[7]  = 3  // point 8
  points[5]  = 5  // point 6

  // Black (negative)
  points[0]  = -2  // point 1
  points[11] = -5  // point 12
  points[16] = -3  // point 17
  points[18] = -5  // point 19

  return {
    points,
    bar:      { white: 0, black: 0 },
    borneOff: { white: 0, black: 0 },
  }
}

export function cloneBoard(board: Board): Board {
  return {
    points:   [...board.points],
    bar:      { ...board.bar },
    borneOff: { ...board.borneOff },
  }
}

/** Number of `player`'s checkers sitting on point index `idx` (0-23). */
export function checkerCountAt(board: Board, player: Player, idx: number): number {
  const v = board.points[idx]
  return player === 'white' ? Math.max(v, 0) : Math.max(-v, 0)
}

/** True if `player` has a single checker (a "blot") on point `idx`. */
export function isBlotAt(board: Board, player: Player, idx: number): boolean {
  const v = board.points[idx]
  return player === 'white' ? v === 1 : v === -1
}

/**
 * True if `player` may legally land on point `idx` — i.e. the point is
 * empty, occupied only by `player`, or occupied by a single opposing blot.
 */
export function isPointOpen(board: Board, player: Player, idx: number): boolean {
  const v = board.points[idx]
  return player === 'white' ? v >= -1 : v <= 1
}

/** True if every one of `player`'s checkers is in their home board (required to bear off). */
export function allCheckersHome(board: Board, player: Player): boolean {
  if (board.bar[player] > 0) return false
  const [start, end] = HOME_RANGE[player]
  for (let i = 0; i < 24; i++) {
    if (i >= start && i <= end) continue
    if (checkerCountAt(board, player, i) > 0) return false
  }
  return true
}

/** True if no checker of `player` sits on a point further from home than index `idx`. */
export function isFurthestFromHome(board: Board, player: Player, idx: number): boolean {
  const [homeStart, homeEnd] = HOME_RANGE[player]
  if (player === 'white') {
    // Further-from-home = higher index (closer to point 24)
    for (let j = idx + 1; j <= homeEnd; j++) {
      if (checkerCountAt(board, player, j) > 0) return false
    }
  } else {
    // Further-from-home = lower index (closer to point 1)
    for (let j = homeStart; j <= idx - 1; j++) {
      if (checkerCountAt(board, player, j) > 0) return false
    }
  }
  return true
}

/** Pip count — total distance `player` must travel to bear off all checkers. */
export function pipCount(board: Board, player: Player): number {
  let pips = board.bar[player] * 25
  for (let i = 0; i < 24; i++) {
    const count = checkerCountAt(board, player, i)
    if (count === 0) continue
    const distance = player === 'white' ? i + 1 : 24 - i
    pips += count * distance
  }
  return pips
}

export function isGameOver(board: Board): Player | null {
  if (board.borneOff.white === 15) return 'white'
  if (board.borneOff.black === 15) return 'black'
  return null
}

/** Determine NORMAL / GAMMON / BACKGAMMON once `winner` has borne off all 15 checkers. */
export function getGameType(board: Board, winner: Player): GameType {
  const loser = opponent(winner)
  if (board.borneOff[loser] > 0) return 'NORMAL'

  if (board.bar[loser] > 0) return 'BACKGAMMON'

  // Backgammon also applies if the loser still has a checker in the winner's home board
  const [homeStart, homeEnd] = HOME_RANGE[winner]
  for (let i = homeStart; i <= homeEnd; i++) {
    if (checkerCountAt(board, loser, i) > 0) return 'BACKGAMMON'
  }

  return 'GAMMON'
}
