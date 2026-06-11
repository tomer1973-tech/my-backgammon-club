import type { Dice } from './types'

/** Roll two six-sided dice. */
export function rollDice(): Dice {
  return [roll(), roll()]
}

function roll(): number {
  return 1 + Math.floor(Math.random() * 6)
}

/**
 * Expand a dice roll into the individual die values that must be played.
 * A double (e.g. [4, 4]) yields four moves of that value.
 */
export function diceToPlay(dice: Dice): number[] {
  return dice[0] === dice[1] ? [dice[0], dice[0], dice[0], dice[0]] : [dice[0], dice[1]]
}
