/**
 * Backgammon engine — public API.
 *
 * A small, dependency-free TypeScript module implementing standard
 * backgammon rules: board state, dice, legal move generation, and
 * win/gammon/backgammon detection.
 *
 * This is the shared foundation for:
 *  - the interactive board UI
 *  - local hot-seat play
 *  - the AI practice opponent
 *  - online real-time matches
 */

export * from './types'
export * from './board'
export * from './dice'
export * from './moves'
export * from './ai'
