/**
 * Round-robin scheduler (circle method).
 *
 * Given an ordered list of player ids (already seeded by ranking — strongest
 * first), produces a balanced schedule where every player meets every other
 * player exactly once.
 *
 * The "circle method": fix the first player, rotate the rest one slot per round.
 * For N players this yields:
 *   - N-1 rounds when N is even (each round has N/2 matches)
 *   - N   rounds when N is odd  (a BYE is added; one player sits out each round)
 *
 * Because the input is seeded by performance, the top seeds are spread across
 * the schedule rather than clustered into the same early rounds.
 */

export interface ScheduledPair {
  round:     number   // 1-based
  player1Id: string
  player2Id: string
}

const BYE = '__BYE__'

export function generateRoundRobin(seededPlayerIds: string[]): ScheduledPair[] {
  // De-dupe defensively while preserving seed order.
  const players = Array.from(new Set(seededPlayerIds))
  if (players.length < 2) return []

  // Pad to an even count with a BYE placeholder (the player paired with BYE
  // simply sits the round out).
  const ids = [...players]
  if (ids.length % 2 !== 0) ids.push(BYE)

  const n      = ids.length
  const rounds = n - 1
  const half   = n / 2

  // Working array we rotate. Index 0 stays fixed; the rest rotate clockwise.
  const arr = [...ids]
  const schedule: ScheduledPair[] = []

  for (let r = 0; r < rounds; r++) {
    for (let i = 0; i < half; i++) {
      const a = arr[i]
      const b = arr[n - 1 - i]
      if (a !== BYE && b !== BYE) {
        // Alternate home/away each round so no one is always "player1".
        const [p1, p2] = r % 2 === 0 ? [a, b] : [b, a]
        schedule.push({ round: r + 1, player1Id: p1, player2Id: p2 })
      }
    }
    // Rotate: keep arr[0] fixed, move arr[1] to the end, shift the rest left.
    const fixed = arr[0]
    const rest  = arr.slice(1)
    rest.unshift(rest.pop()!)
    arr.splice(0, arr.length, fixed, ...rest)
  }

  return schedule
}
