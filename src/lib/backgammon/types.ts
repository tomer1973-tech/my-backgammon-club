/**
 * Backgammon engine — core types.
 *
 * Board representation
 * ─────────────────────
 * `points` is a 24-length array. `points[i]` represents board point `i + 1`
 * (so index 0 = point 1, index 23 = point 24).
 *
 *   value > 0  → that many WHITE checkers on the point
 *   value < 0  → that many BLACK checkers on the point (stored negative)
 *   value === 0 → empty
 *
 * Movement directions
 * ────────────────────
 *   WHITE moves from point 24 → point 1 (decreasing index).
 *     Home board = points 1-6   (indices 0-5)
 *     Bears off "below" point 1.
 *
 *   BLACK moves from point 1 → point 24 (increasing index).
 *     Home board = points 19-24 (indices 18-23)
 *     Bears off "above" point 24.
 *
 * This is an internal convention only — the UI is responsible for flipping
 * the board visually so each player sees their home board in the
 * conventional bottom-right corner.
 */

export type Player = 'white' | 'black'

export type Points = number[] // length 24, see module doc

export interface Board {
  points:   Points
  bar:      Record<Player, number>
  borneOff: Record<Player, number>
}

export interface Move {
  /** `'bar'` = entering from the bar; otherwise a 0-based point index (0-23). */
  from: number | 'bar'
  /** `'off'` = bearing off; otherwise a 0-based point index (0-23). */
  to:   number | 'off'
  /** The die value used for this move (1-6). */
  die:  number
  /** True if this move hits an opposing blot at `to`. */
  hit?: boolean
}

export interface MoveSequence {
  moves: Move[]
  board: Board
}

/** A pair of dice as rolled. */
export type Dice = [number, number]

export type GameType = 'NORMAL' | 'GAMMON' | 'BACKGAMMON'

export interface GameResult {
  winner: Player
  type:   GameType
}

/** Doubling cube state. `owner === null` means the cube is in the center (either player may double). */
export interface CubeState {
  value: number
  owner: Player | null
}
