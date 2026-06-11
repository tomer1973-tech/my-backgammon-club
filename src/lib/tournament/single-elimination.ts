/**
 * Single-elimination bracket generator (seeded knockout).
 *
 * Given players already ordered by ranking (strongest first), this builds a
 * standard seeded bracket: the bracket is padded to the next power of two and
 * the highest seeds receive byes. Seeding follows the classic recursive order
 * (1 plays the lowest, 2 plays the next-lowest, and so on) so the top seeds are
 * spread across the bracket and only meet in later rounds.
 *
 * Output is a flat list of "match specs" describing the whole tree. Byes are
 * pre-resolved: a first-round player who would face an empty slot is placed
 * directly into their second-round match, so we never create a one-player
 * match. Every spec carries `nextKey`/`nextSlot` describing where its WINNER
 * advances, which the caller turns into real `nextMatchId` links after the rows
 * are created.
 *
 * Invariant: a single-elimination bracket for N players always has exactly
 * N-1 matches.
 */

export interface BracketMatchSpec {
  key:       string         // stable temp id, e.g. "r2s0"
  round:     number         // 1-based; the highest round is the final
  slot:      number         // 0-based position within the round (top to bottom)
  player1Id: string | null  // known now (seeded player or bye advancer) or null = decided later
  player2Id: string | null
  nextKey:   string | null  // spec key of the match the winner advances to (null = final)
  nextSlot:  1 | 2 | null    // which player slot the winner fills in the next match
}

export interface BracketPlan {
  matches: BracketMatchSpec[]
  rounds:  number
  byes:    number
}

/** Classic bracket seed order for a power-of-two size, e.g. 4 → [1,4,2,3]. */
function seedOrder(size: number): number[] {
  let seeds = [1]
  while (seeds.length < size) {
    const n = seeds.length * 2
    const next: number[] = []
    for (const s of seeds) next.push(s, n + 1 - s)
    seeds = next
  }
  return seeds
}

const keyOf    = (round: number, slot: number) => `r${round}s${slot}`
const parentOf = (round: number, slot: number) => ({
  round: round + 1,
  slot:  Math.floor(slot / 2),
  slotN: (slot % 2 === 0 ? 1 : 2) as 1 | 2,   // even child → player1, odd child → player2
})

export function generateSingleElimination(seededIds: string[]): BracketPlan {
  const players = Array.from(new Set(seededIds))
  if (players.length < 2) return { matches: [], rounds: 0, byes: 0 }

  const n = players.length
  let size = 1
  while (size < n) size *= 2
  const totalRounds = Math.log2(size)
  const byes        = size - n

  const order         = seedOrder(size)
  const playerForSeed = (seed: number): string | null => (seed <= n ? players[seed - 1] : null)

  // Players pushed up from byes / first-round structure, keyed by "round:slot:slotN".
  const prefilled = new Map<string, string>()
  const matches: BracketMatchSpec[] = []

  // First round: pair seeded positions. Byes advance; real pairings become matches.
  for (let i = 0; i < size / 2; i++) {
    const a = playerForSeed(order[2 * i])
    const b = playerForSeed(order[2 * i + 1])
    const reals = [a, b].filter((x): x is string => x != null)
    const parent = parentOf(1, i)

    if (reals.length === 1) {
      // Bye: the lone player advances straight into the next round.
      prefilled.set(`${parent.round}:${parent.slot}:${parent.slotN}`, reals[0])
    } else if (reals.length === 2) {
      matches.push({
        key: keyOf(1, i), round: 1, slot: i,
        player1Id: a, player2Id: b,
        nextKey:  totalRounds >= 2 ? keyOf(parent.round, parent.slot) : null,
        nextSlot: totalRounds >= 2 ? parent.slotN : null,
      })
    }
  }

  // Rounds 2..final: every node is a real match (slots filled by byes now or by
  // advancing winners later).
  for (let r = 2; r <= totalRounds; r++) {
    const count = size / 2 ** r
    for (let s = 0; s < count; s++) {
      const parent = parentOf(r, s)
      matches.push({
        key: keyOf(r, s), round: r, slot: s,
        player1Id: prefilled.get(`${r}:${s}:1`) ?? null,
        player2Id: prefilled.get(`${r}:${s}:2`) ?? null,
        nextKey:  r < totalRounds ? keyOf(parent.round, parent.slot) : null,
        nextSlot: r < totalRounds ? parent.slotN : null,
      })
    }
  }

  return { matches, rounds: totalRounds, byes }
}
