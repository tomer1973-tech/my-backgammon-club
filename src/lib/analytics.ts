/**
 * Analytics Engine — Pure Computation Module
 *
 * All functions here are stateless pure functions.
 * They accept pre-fetched data arrays and return derived analytics.
 * No DB calls. No side effects. Fully testable.
 *
 * Data flow:
 *   Server Action fetches raw data from Prisma →
 *   Analytics functions compute derived metrics →
 *   Server Components pass results to client chart components
 */

import { OPENING_TYPE_LABEL } from '@/types'
import type { OpeningType, GameType } from '@/types'

// ─────────────────────────────────────────────────────────────────────────────
// INPUT SHAPES
// Minimal types needed — no need to import full domain types.
// ─────────────────────────────────────────────────────────────────────────────

export interface AnalyticsMatch {
  id:           string
  player1Id:    string
  player2Id:    string
  player1Name:  string
  player2Name:  string
  player1Score: number
  player2Score: number
  targetScore:  number
  winnerId:     string | null
  status:       'PENDING' | 'ACTIVE' | 'COMPLETED'
  openingType:  string | null
  duration:     number | null   // seconds
  createdAt:    Date
}

export interface AnalyticsGame {
  matchId:       string
  winnerId:      string   // TournamentMember.id
  loserId:       string
  cubeValue:     number
  gameType:      GameType
  pointsAwarded: number
}

export interface AnalyticsMember {
  id:      string
  name:    string
  isGuest: boolean
  wins:    number
  losses:  number
  points:  number
}

// ─────────────────────────────────────────────────────────────────────────────
// OUTPUT SHAPES
// ─────────────────────────────────────────────────────────────────────────────

export interface PlayerAnalytics {
  memberId:          string
  name:              string

  // Core
  totalMatches:      number
  wins:              number
  losses:            number
  winRate:           number   // 0–100
  tournamentPoints:  number
  avgPointsPerMatch: number

  // Streaks
  currentStreak:     { count: number; type: 'win' | 'loss' | null }
  bestWinStreak:     number

  // Cube / game-type stats
  totalGames:        number
  cubeGames:         number   // games where cubeValue > 1
  cubeUsageRate:     number   // 0–100
  gammonRate:        number   // 0–100
  backgammonRate:    number   // 0–100

  // Match characteristics
  avgMatchDuration:  number   // minutes; 0 if no data
  closeMatchRate:    number   // % matches decided by ≤ 2 pts

  // Opening performance (only matches with openingType set)
  openingPerformance: { opening: string; label: string; wins: number; total: number; rate: number }[]

  // Head-to-head
  headToHead: {
    opponentId:   string
    opponentName: string
    wins:         number
    losses:       number
    total:        number
    winRate:      number
  }[]

  // Timeline for chart (chronological)
  timeline: {
    matchNumber:    number
    date:           string   // "Jan 5"
    win:            boolean
    opponentName:   string
    score:          string   // "7–4"
    cumulativeWins: number
  }[]
}

export interface TournamentSnapshot {
  totalPlayers:          number
  activeMatches:         number
  completedMatches:      number
  totalPossibleMatches:  number   // n*(n-1)/2
  completionPct:         number   // 0–100
  totalGamesPlayed:      number
  avgMatchDurationMin:   number
  gammonRate:            number   // % of all games that were gammons
}

export interface OpeningStats {
  opening:   OpeningType
  label:     string
  count:     number
  winRate:   number   // overall win rate for this opening
}

export interface MomentumPlayer {
  memberId:       string
  name:           string
  currentStreak:  number
  streakType:     'win' | 'loss'
  recentWins:     number   // of last 5 matches
  trend:          'up' | 'down' | 'stable'
  winRate:        number
}

export interface MatchRecommendation {
  player1:          AnalyticsMember
  player2:          AnalyticsMember
  score:            number   // 0–100
  neverPlayed:      boolean
  daysSinceLast:    number | null
  reasons:          string[]
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function daysBetween(a: Date, b: Date): number {
  return Math.abs(a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24)
}

function formatMatchDate(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function avg(nums: number[]): number {
  if (nums.length === 0) return 0
  return nums.reduce((a, b) => a + b, 0) / nums.length
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. PLAYER ANALYTICS
// ─────────────────────────────────────────────────────────────────────────────

export function computePlayerAnalytics(
  memberId:   string,
  memberName: string,
  allMatches: AnalyticsMatch[],
  allGames:   AnalyticsGame[],
  memberPoints: number,
): PlayerAnalytics {
  // Filter to this player's completed matches, sorted oldest→newest
  const completed = allMatches
    .filter(m =>
      m.status === 'COMPLETED' &&
      (m.player1Id === memberId || m.player2Id === memberId),
    )
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())

  const wins   = completed.filter(m => m.winnerId === memberId).length
  const losses = completed.length - wins
  const winRate = completed.length > 0 ? Math.round((wins / completed.length) * 100) : 0

  // ── Streak calculation ──────────────────────────────────────────────────
  let currentStreakCount = 0
  let currentStreakType: 'win' | 'loss' | null = null
  let bestWinStreak   = 0
  let tempWinStreak   = 0

  for (const m of [...completed].reverse()) {
    const won = m.winnerId === memberId
    if (currentStreakType === null) {
      currentStreakType  = won ? 'win' : 'loss'
      currentStreakCount = 1
      if (won) tempWinStreak = 1
    } else if ((won && currentStreakType === 'win') || (!won && currentStreakType === 'loss')) {
      currentStreakCount++
      if (won) tempWinStreak++
    } else {
      break
    }
  }

  // Best win streak: walk forward
  let tempBest = 0
  for (const m of completed) {
    if (m.winnerId === memberId) {
      tempBest++
      bestWinStreak = Math.max(bestWinStreak, tempBest)
    } else {
      tempBest = 0
    }
  }

  // ── Game-level stats (cube, gammon) ────────────────────────────────────
  const playerGames = allGames.filter(g => g.winnerId === memberId || g.loserId === memberId)
  const cubeGames   = playerGames.filter(g => g.cubeValue > 1).length
  const gammons     = playerGames.filter(g => g.gameType === 'GAMMON').length
  const backgammons = playerGames.filter(g => g.gameType === 'BACKGAMMON').length

  // ── Match duration ──────────────────────────────────────────────────────
  const durSeconds = completed.filter(m => m.duration).map(m => m.duration!)
  const avgMatchDuration = avg(durSeconds) / 60  // → minutes

  // ── Close matches (decided by ≤ 2 pts) ─────────────────────────────────
  const closeMatches = completed.filter(m => {
    const loserScore = m.winnerId === m.player1Id ? m.player2Score : m.player1Score
    return m.targetScore - loserScore <= 2
  })

  // ── Opening performance ─────────────────────────────────────────────────
  const openingMap = new Map<string, { wins: number; total: number }>()
  for (const m of completed) {
    if (!m.openingType) continue
    const entry = openingMap.get(m.openingType) ?? { wins: 0, total: 0 }
    entry.total++
    if (m.winnerId === memberId) entry.wins++
    openingMap.set(m.openingType, entry)
  }
  const openingPerformance = Array.from(openingMap.entries())
    .map(([opening, { wins: ow, total }]) => ({
      opening,
      label: OPENING_TYPE_LABEL[opening as OpeningType] ?? opening,
      wins:  ow,
      total,
      rate:  Math.round((ow / total) * 100),
    }))
    .sort((a, b) => b.total - a.total)

  // ── Head to head ────────────────────────────────────────────────────────
  const opponentMap = new Map<string, { name: string; wins: number; losses: number }>()
  for (const m of completed) {
    const isP1      = m.player1Id === memberId
    const oppId     = isP1 ? m.player2Id : m.player1Id
    const oppName   = isP1 ? m.player2Name : m.player1Name
    const won       = m.winnerId === memberId
    const entry     = opponentMap.get(oppId) ?? { name: oppName, wins: 0, losses: 0 }
    won ? entry.wins++ : entry.losses++
    opponentMap.set(oppId, entry)
  }
  const headToHead = Array.from(opponentMap.entries())
    .map(([opponentId, { name: opponentName, wins: ow, losses: ol }]) => ({
      opponentId,
      opponentName,
      wins: ow,
      losses: ol,
      total: ow + ol,
      winRate: Math.round((ow / (ow + ol)) * 100),
    }))
    .sort((a, b) => b.total - a.total)

  // ── Timeline ─────────────────────────────────────────────────────────────
  let cumWins = 0
  const timeline = completed.map((m, i) => {
    const win        = m.winnerId === memberId
    if (win) cumWins++
    const isP1       = m.player1Id === memberId
    const opponentName = isP1 ? m.player2Name : m.player1Name
    const myScore    = isP1 ? m.player1Score : m.player2Score
    const oppScore   = isP1 ? m.player2Score : m.player1Score
    return {
      matchNumber:    i + 1,
      date:           formatMatchDate(m.createdAt),
      win,
      opponentName,
      score:          `${myScore}–${oppScore}`,
      cumulativeWins: cumWins,
    }
  })

  return {
    memberId,
    name:              memberName,
    totalMatches:      completed.length,
    wins,
    losses,
    winRate,
    tournamentPoints:  memberPoints,
    avgPointsPerMatch: completed.length > 0 ? Math.round(memberPoints / wins || 0) : 0,
    currentStreak:     { count: currentStreakCount, type: currentStreakType },
    bestWinStreak,
    totalGames:        playerGames.length,
    cubeGames,
    cubeUsageRate:     playerGames.length > 0 ? Math.round((cubeGames / playerGames.length) * 100) : 0,
    gammonRate:        playerGames.length > 0 ? Math.round((gammons    / playerGames.length) * 100) : 0,
    backgammonRate:    playerGames.length > 0 ? Math.round((backgammons / playerGames.length) * 100) : 0,
    avgMatchDuration:  Math.round(avgMatchDuration),
    closeMatchRate:    completed.length > 0 ? Math.round((closeMatches.length / completed.length) * 100) : 0,
    openingPerformance,
    headToHead,
    timeline,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. TOURNAMENT SNAPSHOT
// ─────────────────────────────────────────────────────────────────────────────

export function computeTournamentSnapshot(
  memberCount: number,
  matches:     AnalyticsMatch[],
  games:       AnalyticsGame[],
): TournamentSnapshot {
  const completed = matches.filter(m => m.status === 'COMPLETED')
  const active    = matches.filter(m => m.status === 'ACTIVE')

  // Round-robin total possible = n*(n-1)/2
  const totalPossible = memberCount > 1 ? (memberCount * (memberCount - 1)) / 2 : 0
  const completionPct = totalPossible > 0
    ? Math.min(100, Math.round((completed.length / totalPossible) * 100))
    : 0

  const durSeconds = completed.filter(m => m.duration).map(m => m.duration!)
  const gammons    = games.filter(g => g.gameType === 'GAMMON').length

  return {
    totalPlayers:         memberCount,
    activeMatches:        active.length,
    completedMatches:     completed.length,
    totalPossibleMatches: totalPossible,
    completionPct,
    totalGamesPlayed:     games.length,
    avgMatchDurationMin:  Math.round(avg(durSeconds) / 60),
    gammonRate:           games.length > 0 ? Math.round((gammons / games.length) * 100) : 0,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. OPENING STATS
// ─────────────────────────────────────────────────────────────────────────────

export function computeOpeningStats(matches: AnalyticsMatch[]): OpeningStats[] {
  const map = new Map<string, { wins: number; total: number }>()

  for (const m of matches) {
    if (m.status !== 'COMPLETED' || !m.openingType) continue
    const entry = map.get(m.openingType) ?? { wins: 0, total: 0 }
    entry.total++
    if (m.winnerId === m.player1Id || m.winnerId) entry.wins++  // winner always set on completed
    map.set(m.openingType, entry)
  }

  return Array.from(map.entries())
    .map(([opening, { wins, total }]) => ({
      opening:  opening as OpeningType,
      label:    OPENING_TYPE_LABEL[opening as OpeningType] ?? opening,
      count:    total,
      winRate:  total > 0 ? Math.round((wins / total) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count)
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. MOMENTUM PLAYERS
// ─────────────────────────────────────────────────────────────────────────────

export function computeMomentumPlayers(
  members: AnalyticsMember[],
  matches: AnalyticsMatch[],
  topN = 3,
): MomentumPlayer[] {
  const result: MomentumPlayer[] = []

  for (const member of members) {
    const playerMatches = matches
      .filter(m =>
        m.status === 'COMPLETED' &&
        (m.player1Id === member.id || m.player2Id === member.id),
      )
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())  // newest first

    if (playerMatches.length === 0) continue

    // Current streak
    let streakCount = 0
    let streakType: 'win' | 'loss' = 'win'
    const first = playerMatches[0]
    streakType  = first.winnerId === member.id ? 'win' : 'loss'

    for (const m of playerMatches) {
      const won = m.winnerId === member.id
      if ((won && streakType === 'win') || (!won && streakType === 'loss')) {
        streakCount++
      } else break
    }

    // Recent 5 matches
    const recent5   = playerMatches.slice(0, 5)
    const recentWins = recent5.filter(m => m.winnerId === member.id).length
    const trend     = recentWins >= 4 ? 'up' : recentWins <= 1 ? 'down' : 'stable'
    const total     = member.wins + member.losses
    const winRate   = total > 0 ? Math.round((member.wins / total) * 100) : 0

    result.push({ memberId: member.id, name: member.name, currentStreak: streakCount, streakType, recentWins, trend, winRate })
  }

  // Sort: winning streaks first, then most recent wins
  return result
    .filter(p => p.streakType === 'win' && p.currentStreak >= 1)
    .sort((a, b) => b.currentStreak - a.currentStreak || b.recentWins - a.recentWins)
    .slice(0, topN)
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. SMART MATCH RECOMMENDATION
//
// Algorithm: score each candidate pair, return the best.
//
// Score components (weighted sum, normalized to 0–100):
//   A. Fewest matches played (play-starved priority)     — weight 35%
//   B. Never played each other bonus                    — weight 25%
//   C. Recency penalty (played in last 2 days)          — weight −20%
//   D. Balanced skill (similar win rates)               — weight 20%
// ─────────────────────────────────────────────────────────────────────────────

export function recommendNextMatch(
  members:       AnalyticsMember[],
  matches:       AnalyticsMatch[],
  activePairIds: Set<string>,   // member IDs currently in an active match
): MatchRecommendation | null {
  // Only consider members not currently in an active match
  const available = members.filter(m => !activePairIds.has(m.id))
  if (available.length < 2) return null

  const completed = matches.filter(m => m.status === 'COMPLETED')
  const now       = new Date()

  let best: MatchRecommendation | null = null
  let bestScore = -Infinity

  for (let i = 0; i < available.length; i++) {
    for (let j = i + 1; j < available.length; j++) {
      const a = available[i]
      const b = available[j]

      // H2H history
      const h2h = completed.filter(m =>
        (m.player1Id === a.id && m.player2Id === b.id) ||
        (m.player1Id === b.id && m.player2Id === a.id),
      ).sort((x, y) => y.createdAt.getTime() - x.createdAt.getTime())

      const neverPlayed    = h2h.length === 0
      const lastPlayed     = h2h[0]
      const daysSinceLast  = lastPlayed ? daysBetween(now, lastPlayed.createdAt) : null

      // A. Play-starved score (prefer players with fewer total matches)
      const aTotal = a.wins + a.losses
      const bTotal = b.wins + b.losses
      const maxPossible = members.length - 1   // max matches per player
      const aStarved = Math.max(0, maxPossible - aTotal)
      const bStarved = Math.max(0, maxPossible - bTotal)
      const starvedScore = ((aStarved + bStarved) / (maxPossible * 2)) * 35

      // B. Never-played bonus
      const neverBonus = neverPlayed ? 25 : Math.min(20, h2h.length === 0 ? 0 : 20 / h2h.length)

      // C. Recency penalty
      const recencyPenalty = daysSinceLast !== null && daysSinceLast < 2 ? -20 : 0

      // D. Balance score (similar skill)
      const aRate = aTotal > 0 ? (a.wins / aTotal) * 100 : 50
      const bRate = bTotal > 0 ? (b.wins / bTotal) * 100 : 50
      const skillGap    = Math.abs(aRate - bRate)
      const balanceScore = Math.max(0, 20 - skillGap * 0.4)

      const rawScore = starvedScore + neverBonus + recencyPenalty + balanceScore

      if (rawScore > bestScore) {
        bestScore = rawScore

        const reasons: string[] = []
        if (neverPlayed)                          reasons.push("First time playing each other")
        if (aStarved > 0 || bStarved > 0)         reasons.push("Both players need more matches")
        if (skillGap < 15)                         reasons.push("Evenly matched skill levels")
        if (daysSinceLast && daysSinceLast > 5)    reasons.push("Good rotation — haven't played recently")
        if (aTotal === 0 || bTotal === 0)          reasons.push("At least one player hasn't played yet")

        best = {
          player1:       a,
          player2:       b,
          score:         Math.min(100, Math.max(0, Math.round(rawScore))),
          neverPlayed,
          daysSinceLast: daysSinceLast !== null ? Math.round(daysSinceLast) : null,
          reasons:       reasons.length > 0 ? reasons : ['Good competitive balance'],
        }
      }
    }
  }

  return best
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. PLAYER TIMELINE for chart (win rate over time)
// ─────────────────────────────────────────────────────────────────────────────

export function buildWinRateTimeline(timeline: PlayerAnalytics['timeline']): {
  match: number; date: string; cumulativeWins: number; winRate: number
}[] {
  return timeline.map((t, i) => ({
    match:          t.matchNumber,
    date:           t.date,
    cumulativeWins: t.cumulativeWins,
    winRate:        Math.round((t.cumulativeWins / t.matchNumber) * 100),
  }))
}
