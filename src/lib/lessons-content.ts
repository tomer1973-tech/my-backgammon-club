/**
 * Lessons content — interactive backgammon tutorial.
 *
 * Each lesson is a sequence of steps shown on the same `BackgammonBoard`
 * used elsewhere in the app. A step is either:
 *  - informational (`sequences` omitted) — the board is a static diagram
 *    and the learner just reads and clicks "Next", or
 *  - a move step (`sequences` set) — the learner must play one of the
 *    given move sequences (using the same prefix-matching interaction as
 *    local play, practice, and live matches) before continuing.
 *
 * Board positions are built from 1-indexed point numbers for readability;
 * `points[i]` (0-indexed) holds positive counts for white, negative for
 * black, matching the engine's convention (white moves 24 → 1).
 */

import type { Board, Player, Dice, Move, CubeState } from './backgammon'

export interface LessonStep {
  title:   string
  body:    string[]
  board:   Board
  toMove?: Player
  dice?:   Dice
  cube?:   CubeState
  /** One or more correct full move sequences for this step's dice roll. */
  sequences?: Move[][]
  /** Shown once the learner completes the step's move. */
  success?: string
}

export interface Lesson {
  slug:        string
  title:       string
  level:       'Beginner' | 'Intermediate' | 'Advanced'
  description: string
  steps:       LessonStep[]
}

function emptyBoard(): Board {
  return { points: Array(24).fill(0), bar: { white: 0, black: 0 }, borneOff: { white: 0, black: 0 } }
}

/** Build a board from 1-indexed point numbers (positive = white, negative = black). */
function customBoard(
  points: Record<number, number>,
  extra?: { bar?: Partial<Record<Player, number>>; borneOff?: Partial<Record<Player, number>> },
): Board {
  const b = emptyBoard()
  for (const [point, count] of Object.entries(points)) b.points[Number(point) - 1] = count
  if (extra?.bar)      b.bar      = { ...b.bar, ...extra.bar }
  if (extra?.borneOff) b.borneOff = { ...b.borneOff, ...extra.borneOff }
  return b
}

const STARTING_BOARD = customBoard({
  24: 2, 13: 5, 8: 3, 6: 5,
  1: -2, 12: -5, 17: -3, 19: -5,
})

export const LESSONS: Lesson[] = [
  {
    slug:  'reading-the-board',
    title: 'Reading the Board',
    level: 'Beginner',
    description: 'Learn how the board is laid out and which way each side moves.',
    steps: [
      {
        title: 'Welcome to backgammon',
        body: [
          'Each player has 15 checkers — white (light) and black (dark) — arranged across 24 numbered points.',
          'The goal is simple: race your checkers all the way around the board into your home board, then bear them all off before your opponent does.',
        ],
        board: STARTING_BOARD,
      },
      {
        title: 'Two directions of travel',
        body: [
          'White moves from point 24 toward point 1. White\'s home board is the bottom-right quadrant — points 1 through 6.',
          'Black moves the opposite way, from point 1 toward point 24. Black\'s home board is points 19 through 24.',
          'Both players are racing toward their own home board, in opposite directions, on the same track.',
        ],
        board: STARTING_BOARD,
      },
      {
        title: 'The bar and bearing off',
        body: [
          'If your checker is hit by the opponent, it goes to the "bar" in the middle of the board, and must re-enter through the opponent\'s home board before you can make any other move.',
          'Once all 15 of your checkers are in your home board, you can start "bearing off" — removing them from the board. The first player to bear off all 15 wins.',
        ],
        board: STARTING_BOARD,
      },
      {
        title: 'Rolling the dice',
        body: [
          'Each turn you roll two dice and may move checkers by that many points — one checker per die, or the same checker twice.',
          'If you roll doubles (e.g. 4-4), you get to play that number four times instead of two.',
          'You must use as many of your dice as legally possible — if you can play one die but not both, the rules even decide which one you\'re forced to use.',
        ],
        board: STARTING_BOARD,
      },
    ],
  },

  {
    slug:  'making-a-point',
    title: 'Making an Opening Point',
    level: 'Beginner',
    description: 'Play out a strong opening roll and make your 5-point.',
    steps: [
      {
        title: 'A strong opening roll',
        body: [
          'White has rolled 3-1 — one of the best opening rolls in the game.',
          'It lets White bring a checker down from the 8-point and another from the 6-point, landing both on the 5-point. That builds a "made point": two or more checkers on the same point, which the opponent can\'t land on or hit.',
          'Try it — click your checker on the 8-point, then play it to the 5-point with the 3. Then do the same from the 6-point with the 1.',
        ],
        board: STARTING_BOARD,
        toMove: 'white',
        dice: [3, 1],
        sequences: [
          [{ from: 7, to: 4, die: 3 }, { from: 5, to: 4, die: 1 }],
          [{ from: 5, to: 4, die: 1 }, { from: 7, to: 4, die: 3 }],
        ],
        success: 'You made the 5-point! Two checkers now guard it — your opponent can\'t land there or hit a lone checker on it.',
      },
      {
        title: 'Why made points matter',
        body: [
          'A made point does two things: it blocks that point for your opponent, and it keeps your checkers safe from being hit.',
          'The 5-point is especially valuable — it sits right in your opponent\'s path home, making it harder for them to escape their back checkers.',
          'Strong opening strategy is largely about making key points like the 5-point, 4-point, and bar-point whenever your roll allows it.',
        ],
        board: STARTING_BOARD,
      },
    ],
  },

  {
    slug:  'hitting-and-the-bar',
    title: 'Hitting & the Bar',
    level: 'Beginner',
    description: 'Hit a vulnerable blot, then see what your opponent must do to recover.',
    steps: [
      {
        title: 'Blots are vulnerable',
        body: [
          'A "blot" is a single checker alone on a point. If an opponent\'s checker can land on it, it gets hit — sent to the bar.',
          'A checker on the bar is completely stuck: it must re-enter through the opponent\'s home board before that player can make any other move.',
          'Below, Black has left a blot on the 8-point. White can hit it.',
        ],
        board: customBoard({ 24: 2, 13: 1, 8: -1, 6: 5, 1: -2, 19: -5 }),
        toMove: 'white',
      },
      {
        title: 'Make the hit',
        body: [
          'White rolls 5-3. Playing the checker on the 13-point down 5 lands it right on Black\'s blot on the 8-point — a hit!',
          'Click the checker on the 13-point, then play it to the 8-point with the 5.',
        ],
        board: customBoard({ 24: 2, 13: 1, 8: -1, 6: 5, 1: -2, 19: -5 }),
        toMove: 'white',
        dice: [5, 3],
        sequences: [
          [{ from: 12, to: 7, die: 5 }],
        ],
        success: 'Hit! Black\'s checker is sent to the bar.',
      },
      {
        title: 'Recovering from the bar',
        body: [
          'Black now has a checker on the bar and must enter it into White\'s home board (points 1–6) before doing anything else.',
          'A checker enters on the point matching the die rolled — but only if White doesn\'t already hold that point with two or more checkers.',
          'Black rolls 6-4. The 6 would enter on the 6-point, but White holds it with 5 checkers — blocked. The 4-point is open, so Black must enter there.',
          'Click the checker on the bar, then play it onto the 4-point with the 4.',
        ],
        board: customBoard({ 24: 2, 8: 1, 6: 5, 1: -2, 19: -5 }, { bar: { black: 1 } }),
        toMove: 'black',
        dice: [6, 4],
        sequences: [
          [{ from: 'bar', to: 3, die: 4 }],
        ],
        success: 'Black is back on the board. Once a checker enters from the bar, that player can use any remaining dice normally.',
      },
    ],
  },

  {
    slug:  'bearing-off',
    title: 'Bearing Off',
    level: 'Intermediate',
    description: 'Bring your checkers home and learn the rules for bearing off.',
    steps: [
      {
        title: 'Getting checkers off the board',
        body: [
          'Once all 15 of your checkers are in your home board, you can start bearing them off.',
          'A roll of N bears off a checker from the N-point — for White, the 6-point needs a 6, the 5-point needs a 5, and so on.',
          'White has all 12 remaining checkers home (3 already borne off) and rolls 6-5 — a perfect match for the 6-point and 5-point.',
        ],
        board: customBoard(
          { 6: 2, 5: 2, 4: 2, 3: 2, 2: 2, 1: 2, 24: -5, 19: -5, 17: -2, 13: -3 },
          { borneOff: { white: 3 } },
        ),
        toMove: 'white',
      },
      {
        title: 'Bear off both checkers',
        body: [
          'Play the 6 to bear off a checker from the 6-point, and the 5 to bear off a checker from the 5-point — in either order.',
        ],
        board: customBoard(
          { 6: 2, 5: 2, 4: 2, 3: 2, 2: 2, 1: 2, 24: -5, 19: -5, 17: -2, 13: -3 },
          { borneOff: { white: 3 } },
        ),
        toMove: 'white',
        dice: [6, 5],
        sequences: [
          [{ from: 5, to: 'off', die: 6 }, { from: 4, to: 'off', die: 5 }],
          [{ from: 4, to: 'off', die: 5 }, { from: 5, to: 'off', die: 6 }],
        ],
        success: 'Two more checkers borne off — 5 down, 10 to go.',
      },
      {
        title: 'Rolling higher than you need',
        body: [
          'What if your roll is higher than any point that still has a checker? You can still bear off — but only the checker that is furthest from home.',
          'White\'s only checkers left are two on the 4-point, and rolls double 6s. A 6 is more than enough to bear off from the 4-point, and since these are the furthest-back checkers, both are allowed off.',
        ],
        board: customBoard(
          { 4: 2, 24: -5, 19: -5, 17: -2, 13: -3 },
          { borneOff: { white: 13 } },
        ),
        toMove: 'white',
      },
      {
        title: 'Finish the lesson',
        body: [
          'Play both 6s to bear off the last two checkers from the 4-point.',
        ],
        board: customBoard(
          { 4: 2, 24: -5, 19: -5, 17: -2, 13: -3 },
          { borneOff: { white: 13 } },
        ),
        toMove: 'white',
        dice: [6, 6],
        sequences: [
          [{ from: 3, to: 'off', die: 6 }, { from: 3, to: 'off', die: 6 }],
        ],
        success: 'All 15 checkers borne off — that\'s the win!',
      },
    ],
  },

  {
    slug:  'doubling-cube',
    title: 'The Doubling Cube',
    level: 'Intermediate',
    description: 'Understand how the doubling cube raises the stakes of a game.',
    steps: [
      {
        title: 'Raising the stakes',
        body: [
          'Matches are usually played for more than one point per game. The doubling cube — showing 2, 4, 8, 16, 32, or 64 — tracks the current stakes.',
          'It starts in the middle of the board, at 1, owned by neither player. Either player may "double" before rolling, offering to raise the stakes to 2.',
        ],
        board: STARTING_BOARD,
        cube: { value: 1, owner: null },
      },
      {
        title: 'Accept or decline',
        body: [
          'When offered a double, the opponent has two choices: accept, taking ownership of the cube at the new value, or decline, immediately conceding the game at the current stakes.',
          'Here, Black has accepted a double to 2 — the cube moves to Black\'s side, and only Black may offer the next double, to 4.',
          'A good rule of thumb: accept if you think you have at least a 25% chance of winning from here — declining always costs you the current stake.',
        ],
        board: STARTING_BOARD,
        cube: { value: 2, owner: 'black' },
      },
      {
        title: 'Gammons and backgammons',
        body: [
          'The final score is also multiplied if a player wins big: a "gammon" (opponent bears off zero checkers) doubles the points, and a "backgammon" (opponent still has a checker in your home board or on the bar) triples them.',
          'Combined with the cube, a single game can swing a match by many points — which is what makes the doubling cube such a powerful strategic tool.',
        ],
        board: STARTING_BOARD,
        cube: { value: 4, owner: 'white' },
      },
    ],
  },
]

export function getLesson(slug: string): Lesson | undefined {
  return LESSONS.find(l => l.slug === slug)
}
