/**
 * Backgammon engine — move generation & application.
 */

import type { Board, Move, MoveSequence, Player, Dice } from './types'
import {
  cloneBoard, opponent, checkerCountAt, isPointOpen, isBlotAt,
  allCheckersHome, isFurthestFromHome, HOME_RANGE,
} from './board'
import { diceToPlay } from './dice'

/** Index a checker lands on when entering from the bar with `die`. */
function entryIndex(player: Player, die: number): number {
  return player === 'white' ? 24 - die : die - 1
}

/** Index a checker on `from` lands on after moving `die` pips, for `player`. */
function destinationIndex(player: Player, from: number, die: number): number {
  return player === 'white' ? from - die : from + die
}

/**
 * All single-die moves available to `player` for one `die` value, given the
 * current board — without regard to other dice in the roll.
 *
 * If the player has checkers on the bar, only bar-entry moves are returned
 * (entry is mandatory before any other move).
 */
export function singleMoves(board: Board, player: Player, die: number): Move[] {
  const moves: Move[] = []

  if (board.bar[player] > 0) {
    const idx = entryIndex(player, die)
    if (isPointOpen(board, player, idx)) {
      moves.push({ from: 'bar', to: idx, die, hit: isBlotAt(board, opponent(player), idx) })
    }
    return moves
  }

  const canBearOff = allCheckersHome(board, player)
  const [homeStart, homeEnd] = HOME_RANGE[player]

  for (let i = 0; i < 24; i++) {
    if (checkerCountAt(board, player, i) === 0) continue
    const dest = destinationIndex(player, i, die)

    if (dest >= 0 && dest <= 23) {
      if (isPointOpen(board, player, dest)) {
        moves.push({ from: i, to: dest, die, hit: isBlotAt(board, opponent(player), dest) })
      }
      continue
    }

    // Destination is off the board — only legal while bearing off.
    if (!canBearOff) continue
    if (i < homeStart || i > homeEnd) continue

    const distance = player === 'white' ? i + 1 : 24 - i
    if (distance === die) {
      moves.push({ from: i, to: 'off', die })
    } else if (die > distance && isFurthestFromHome(board, player, i)) {
      // Overshoot is allowed only for the checker furthest from home.
      moves.push({ from: i, to: 'off', die })
    }
  }

  return moves
}

/** Apply a single move to `board`, returning a new board (input is not mutated). */
export function applyMove(board: Board, player: Player, move: Move): Board {
  const next = cloneBoard(board)
  const opp  = opponent(player)
  const sign = player === 'white' ? 1 : -1

  // Remove from source
  if (move.from === 'bar') {
    next.bar[player] -= 1
  } else {
    next.points[move.from] -= sign
  }

  // Place at destination
  if (move.to === 'off') {
    next.borneOff[player] += 1
  } else {
    // Hit an opposing blot
    if (isBlotAt(next, opp, move.to)) {
      next.points[move.to] = 0
      next.bar[opp] += 1
    }
    next.points[move.to] += sign
  }

  return next
}

/**
 * All maximal-length legal move sequences for `player` given a dice roll.
 *
 * Each sequence is a full ordering of moves (using doubles → 4 moves) that
 * is legal to play in order. Per the rules:
 *  - As many dice as possible must be used.
 *  - If only one die of a non-double can be played, the higher value must
 *    be used if doing so is possible.
 *
 * Returns `[{ moves: [], board }]` (a single empty sequence) if the player
 * has no legal moves at all — i.e. they must pass.
 */
export function getLegalSequences(board: Board, player: Player, dice: Dice): MoveSequence[] {
  const diceValues = diceToPlay(dice)
  const results: MoveSequence[] = []

  function recurse(currentBoard: Board, remainingDice: number[], movesSoFar: Move[]) {
    const triedDice = new Set<number>()
    let foundMove = false

    for (let i = 0; i < remainingDice.length; i++) {
      const die = remainingDice[i]
      if (triedDice.has(die)) continue
      triedDice.add(die)

      const candidates = singleMoves(currentBoard, player, die)
      for (const move of candidates) {
        foundMove = true
        const nextBoard = applyMove(currentBoard, player, move)
        const nextRemaining = [...remainingDice]
        nextRemaining.splice(i, 1)
        recurse(nextBoard, nextRemaining, [...movesSoFar, move])
      }
    }

    if (!foundMove) {
      results.push({ moves: movesSoFar, board: currentBoard })
    }
  }

  recurse(board, diceValues, [])

  const maxLen = results.reduce((m, r) => Math.max(m, r.moves.length), 0)
  let filtered = results.filter(r => r.moves.length === maxLen)

  // Non-double, only one die playable: prefer the higher value if it's an option.
  if (maxLen === 1 && diceValues.length === 2 && diceValues[0] !== diceValues[1]) {
    const higher = Math.max(diceValues[0], diceValues[1])
    if (filtered.some(r => r.moves[0].die === higher)) {
      filtered = filtered.filter(r => r.moves[0].die === higher)
    }
  }

  return dedupeSequences(filtered)
}

/** True if `partial` is a move-for-move prefix of `full`. */
export function isSequencePrefix(partial: Move[], full: Move[]): boolean {
  if (partial.length > full.length) return false
  return partial.every((m, i) => movesEqual(m, full[i]))
}

export function movesEqual(a: Move, b: Move): boolean {
  return a.from === b.from && a.to === b.to && a.die === b.die
}

function dedupeSequences(sequences: MoveSequence[]): MoveSequence[] {
  const seen = new Set<string>()
  const out: MoveSequence[] = []
  for (const seq of sequences) {
    const key = seq.moves.map(m => `${m.from}-${m.to}-${m.die}`).join('|')
    if (seen.has(key)) continue
    seen.add(key)
    out.push(seq)
  }
  return out
}
