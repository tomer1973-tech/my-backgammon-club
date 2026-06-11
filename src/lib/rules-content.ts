/**
 * Static reference content for the /rules pages.
 * Plain data — no JSX — so it can be imported from both server and client components.
 */

export interface GlossaryTerm {
  term: string
  definition: string
}

export const GLOSSARY: GlossaryTerm[] = [
  { term: 'Pip',          definition: 'One point of distance a checker must travel. A checker on point 8 moving to point 5 covers 3 pips.' },
  { term: 'Pip count',    definition: 'The total number of pips a player needs to bear off all 15 checkers. Lower is better.' },
  { term: 'Blot',         definition: 'A single checker on a point, vulnerable to being hit by an opposing checker.' },
  { term: 'Hit',          definition: 'Landing on a point occupied by a single opposing checker (a blot), sending it to the bar.' },
  { term: 'Bar',          definition: 'The divider in the middle of the board. Hit checkers go here and must re-enter before any other move.' },
  { term: 'Bear off',     definition: 'Removing a checker from the board once all of a player’s checkers are in their home board.' },
  { term: 'Home board',   definition: 'The 6 points (1-6 for one player, 19-24 for the other) where checkers must gather before bearing off.' },
  { term: 'Outer board',  definition: 'The 12 points outside both players’ home boards.' },
  { term: 'Point',        definition: 'Two or more checkers of the same color on a single board position, making it safe from being hit.' },
  { term: 'Prime',        definition: 'Six consecutive points made by one player, forming a wall the opponent cannot cross.' },
  { term: 'Anchor',       definition: 'A made point in the opponent’s home board, giving a safe base to wait for a shot.' },
  { term: 'Gammon',       definition: 'Winning before the loser bears off any checkers — worth double the cube value.' },
  { term: 'Backgammon',   definition: 'Winning before the loser bears off any checkers, while the loser still has a checker on the bar or in the winner’s home board — worth triple the cube value.' },
  { term: 'Doubling cube',definition: 'A die marked 2, 4, 8, 16, 32, 64 used to raise the stakes of a game.' },
  { term: 'Take / Pass',  definition: 'A player offered the doubling cube may "take" (accept, continue at double stakes) or "pass" (decline, forfeit the current cube value).' },
  { term: 'Crawford rule',definition: 'In match play, once a player reaches match point minus one, the next game is played without the doubling cube.' },
  { term: 'Race',         definition: 'A position with no further contact possible — the outcome depends only on dice rolls and pip counts.' },
  { term: 'Contact',      definition: 'A position where checkers from both players can still potentially hit each other.' },
]

export interface StrategyArticle {
  slug: string
  title: string
  summary: string
  level: 'Beginner' | 'Intermediate' | 'Advanced'
  sections: { heading: string; paragraphs: string[] }[]
}

export const STRATEGY_ARTICLES: StrategyArticle[] = [
  {
    slug: 'opening-moves',
    title: 'Opening Rolls & Best Replies',
    summary: 'The standard, well-tested response to each of the 15 opening dice rolls.',
    level: 'Beginner',
    sections: [
      {
        heading: 'Why openings matter',
        paragraphs: [
          'There are only 15 distinct opening rolls (doubles can’t be played first since both players start with the same position, so the first roll is always a non-double). Strong players have memorized the best reply to each, because a small early edge compounds over the course of a game.',
          'As a beginner, you don’t need to memorize every line — focus on the underlying ideas: make your 5-point and 4-point when you can, build a strong home board, and avoid leaving easy shots.',
        ],
      },
      {
        heading: 'The most important rolls',
        paragraphs: [
          '6-1: Run a back checker from your 24-point to your 18-point ("lover’s leap"). This is the most popular and safest reply.',
          '5-3: Make your 3-point by playing 8/3, 6/3. Building home-board points early makes future hits much more punishing.',
          '6-5: Run a back checker all the way to your 12-point (24/13). This gets a checker out of danger immediately.',
          '3-1: Make your 5-point with 8/5, 6/5. The 5-point is the single most valuable point on the board — grab it whenever you can.',
          '4-2: Make your 4-point with 8/4, 6/4. Another excellent home-board point.',
        ],
      },
      {
        heading: 'General opening principles',
        paragraphs: [
          'Prioritize making points in this order of value: 5-point, 4-point, bar-point (7-point), 3-point.',
          'When in doubt, bring builders down from your midpoint (13-point) toward your home board so you have material ready to make points on future rolls.',
          'Avoid splitting your back checkers (24-point) into the open early unless the roll forces it — a stray blot deep in your opponent’s home board is risky.',
        ],
      },
    ],
  },
  {
    slug: 'checker-play-basics',
    title: 'Checker Play Fundamentals',
    summary: 'How to balance safety, flexibility, and building a strong position.',
    level: 'Beginner',
    sections: [
      {
        heading: 'Safety vs. flexibility',
        paragraphs: [
          'Every move is a trade-off between leaving a blot (risk) and keeping your checkers stacked or anchored (safety, but less flexible). Early in the game, slightly favor flexibility — spread builders across the outer board so you have many ways to make points.',
          'Later in the game, as contact decreases, shift toward safety: stack checkers on made points and avoid unnecessary blots.',
        ],
      },
      {
        heading: 'Counting shots',
        paragraphs: [
          'Before leaving a blot, count how many of the 36 dice combinations let your opponent hit it. A blot that can be hit by only 2-3 combinations is usually an acceptable risk if the positional gain is large; a blot exposed to 11+ combinations ("double shots") is usually too dangerous unless you have no better option.',
        ],
      },
      {
        heading: 'Building primes',
        paragraphs: [
          'A prime — six consecutive made points — completely blocks an opposing checker from passing. Even a partial prime (4-5 consecutive points) drastically reduces your opponent’s rolls that escape cleanly.',
          'When you have an opponent’s checker trapped behind a partial prime, prioritize extending the prime over almost everything else.',
        ],
      },
    ],
  },
  {
    slug: 'doubling-cube-strategy',
    title: 'Using the Doubling Cube',
    summary: 'When to double, when to take, and when to pass.',
    level: 'Intermediate',
    sections: [
      {
        heading: 'The basic framework',
        paragraphs: [
          'A rough rule of thumb: if you estimate your winning chances are above ~70%, you should double. Your opponent should take if their winning chances are above ~25%, and pass otherwise. The gap between 25% and 70% is the "doubling window" where doubling is correct but the opponent should still take.',
          'These numbers come from the "cube value" — doubling roughly doubles the value of the game, so a take is correct as long as the opponent’s expected loss from taking is less than their expected loss from passing (which is always exactly 1 point at the current cube value).',
        ],
      },
      {
        heading: 'Don’t over-double',
        paragraphs: [
          'If your position is so strong that you’re likely to win a gammon (your opponent bears off zero checkers), it’s often better to play on for the gammon rather than double — a double that gets passed only nets you 1 point, but a gammon at the current cube value is worth 2.',
          'This is sometimes called being "too good to double".',
        ],
      },
      {
        heading: 'Market losers',
        paragraphs: [
          'A "market loser" is a roll that would swing the position so far in your favor that your opponent would no longer take a double. If your position has many market-losing rolls, that’s a strong signal to double now while your opponent can still take — waiting risks losing the chance to cash in your advantage.',
        ],
      },
    ],
  },
  {
    slug: 'bearing-off-safely',
    title: 'Bearing Off Safely',
    summary: 'How to avoid leaving shots while clearing your home board.',
    level: 'Intermediate',
    sections: [
      {
        heading: 'Clear from the back',
        paragraphs: [
          'When no contact remains, the safest general approach is to clear your highest-numbered home board points first (e.g. clear the 6-point before the 1-point), filling gaps evenly so you rarely need to break a point with an odd checker left over.',
        ],
      },
      {
        heading: 'When your opponent still has checkers in your home board',
        paragraphs: [
          'If your opponent has an anchor in your home board, every shot matters. Avoid leaving blots, even if it means bearing off less efficiently — a single hit deep in a bear-off race can completely reverse the game.',
          'In these positions, it’s often correct to bear off from the point matching your anchor’s position last, and to keep your board as "even" as possible (avoid stacking many checkers on one point while others are empty).',
        ],
      },
    ],
  },
]
