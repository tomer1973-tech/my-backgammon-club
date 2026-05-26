/**
 * Pure stats calculation functions.
 * No side effects, no imports from React or DB layers.
 * Input: Game[] with resolved member names.
 * Output: typed stats objects from types/index.ts.
 */

import type { Game, PlayerStats, HeadToHeadStats, RankedMember, Member } from '../types'

// ─────────────────────────────────────────────────────────────────────────────
// PLAYER STATS
// ─────────────────────────────────────────────────────────────────────────────

export function calcPlayerStats(games: Game[], memberId: string): PlayerStats {
  const myGames = games.filter(
    g => g.winnerId === memberId || g.loserId === memberId,
  )

  const wins   = myGames.filter(g => g.winnerId === memberId)
  const losses = myGames.filter(g => g.loserId  === memberId)

  const totalGames = myGames.length
  const winRate    = totalGames > 0 ? Math.round((wins.length / totalGames) * 100) : 0

  const pointsWon  = wins.reduce((sum, g) => sum + g.points, 0)
  const pointsLost = losses.reduce((sum, g) => sum + g.points, 0)

  const avgCubeValue =
    totalGames > 0
      ? parseFloat((myGames.reduce((sum, g) => sum + g.multiplier, 0) / totalGames).toFixed(1))
      : 0

  // Gammon / Backgammon counts are game-type based, not cube-value based
  const gammons     = myGames.filter(g => g.gameType === 'GAMMON').length
  const backgammons = myGames.filter(g => g.gameType === 'BACKGAMMON').length

  const streak = calcStreak(myGames, memberId)

  return {
    memberId,
    totalGames,
    wins:       wins.length,
    losses:     losses.length,
    winRate,
    pointsWon,
    pointsLost,
    netPoints:  pointsWon - pointsLost,
    avgCubeValue,
    gammons,
    backgammons,
    streak,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// STREAK
// ─────────────────────────────────────────────────────────────────────────────

function calcStreak(
  games: Game[],
  memberId: string,
): PlayerStats['streak'] {
  // Sort descending by date (most recent first)
  const sorted = [...games].sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
  )

  if (sorted.length === 0) return { current: 0, type: null, best: 0 }

  // Current streak
  const firstResult = sorted[0].winnerId === memberId ? 'win' : 'loss'
  let current = 0
  for (const g of sorted) {
    const result = g.winnerId === memberId ? 'win' : 'loss'
    if (result === firstResult) current++
    else break
  }

  // Best win streak (scan entire history)
  let best = 0
  let run  = 0
  for (const g of [...sorted].reverse()) {
    if (g.winnerId === memberId) {
      run++
      best = Math.max(best, run)
    } else {
      run = 0
    }
  }

  return { current, type: firstResult, best }
}

// ─────────────────────────────────────────────────────────────────────────────
// HEAD TO HEAD
// ─────────────────────────────────────────────────────────────────────────────

export function calcHeadToHead(
  games: Game[],
  memberId: string,
  opponentId: string,
): HeadToHeadStats {
  // Find the opponent's member info for the name
  const between = games.filter(
    g =>
      (g.winnerId === memberId   && g.loserId  === opponentId) ||
      (g.loserId  === memberId   && g.winnerId === opponentId),
  )

  const wins   = between.filter(g => g.winnerId === memberId).length
  const losses = between.filter(g => g.loserId  === memberId).length
  const total  = between.length
  const winRate = total > 0 ? Math.round((wins / total) * 100) : 0

  const netPoints = between.reduce((sum, g) => {
    return sum + (g.winnerId === memberId ? g.points : -g.points)
  }, 0)

  // Resolve opponent name from the games
  const opponentName =
    between.find(g => g.winnerId === opponentId)?.winnerName ??
    between.find(g => g.loserId  === opponentId)?.loserName  ??
    'Unknown'

  return { memberId, opponentId, opponentName, wins, losses, total, winRate, netPoints }
}

// ─────────────────────────────────────────────────────────────────────────────
// ALL HEAD-TO-HEAD RECORDS (for a given member vs all others)
// ─────────────────────────────────────────────────────────────────────────────

export function calcAllHeadToHead(
  games: Game[],
  memberId: string,
  members: Member[],
): HeadToHeadStats[] {
  return members
    .filter(m => m.id !== memberId)
    .map(opp => calcHeadToHead(games, memberId, opp.id))
    .sort((a, b) => b.total - a.total)
}

// ─────────────────────────────────────────────────────────────────────────────
// BEST / TOUGHEST OPPONENT
// ─────────────────────────────────────────────────────────────────────────────

export function calcBestAndToughest(
  h2hStats: HeadToHeadStats[],
): { best: HeadToHeadStats | null; toughest: HeadToHeadStats | null } {
  const played = h2hStats.filter(s => s.total > 0)
  if (played.length === 0) return { best: null, toughest: null }

  const sorted  = [...played].sort((a, b) => b.winRate - a.winRate)
  const best     = sorted[0]
  const toughest = sorted[sorted.length - 1]

  // Don't show same opponent as both best and toughest
  return {
    best,
    toughest: toughest.opponentId !== best.opponentId ? toughest : null,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// RANKED STANDINGS
// ─────────────────────────────────────────────────────────────────────────────

export function buildStandings(members: Member[]): RankedMember[] {
  return [...members]
    .sort((a, b) => {
      // Primary: points descending
      if (b.points !== a.points) return b.points - a.points
      // Tiebreak 1: win rate
      const aRate = (a.wins + a.losses) > 0 ? a.wins / (a.wins + a.losses) : 0
      const bRate = (b.wins + b.losses) > 0 ? b.wins / (b.wins + b.losses) : 0
      if (bRate !== aRate) return bRate - aRate
      // Tiebreak 2: total games played (more games = higher rank)
      return (b.wins + b.losses) - (a.wins + a.losses)
    })
    .map((m, i) => ({
      ...m,
      rank:    i + 1,
      winRate: (m.wins + m.losses) > 0
        ? Math.round((m.wins / (m.wins + m.losses)) * 100)
        : 0,
    }))
}

// ─────────────────────────────────────────────────────────────────────────────
// ACTIVITY (last N days)
// ─────────────────────────────────────────────────────────────────────────────

export interface DayActivity {
  date:  Date
  label: string   // e.g. "Mon"
  count: number   // games played by this member on this day
}

export function calcRecentActivity(
  games: Game[],
  memberId: string,
  days = 7,
): DayActivity[] {
  const result: DayActivity[] = []
  const now = new Date()

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    d.setHours(0, 0, 0, 0)

    const next = new Date(d)
    next.setDate(next.getDate() + 1)

    const count = games.filter(g => {
      const ts = g.createdAt instanceof Date ? g.createdAt : new Date(g.createdAt)
      return (
        ts >= d && ts < next &&
        (g.winnerId === memberId || g.loserId === memberId)
      )
    }).length

    result.push({
      date:  d,
      label: d.toLocaleDateString('en', { weekday: 'short' }),
      count,
    })
  }

  return result
}

// ─────────────────────────────────────────────────────────────────────────────
// POINTS CALCULATION (used in Server Actions before DB write)
// ─────────────────────────────────────────────────────────────────────────────

import { GAME_TYPE_MULTIPLIER } from '../types'
import type { GameType, CubeValue } from '../types'

export function calcGamePoints(
  pointsPerWin: number,
  cubeValue: CubeValue,
  gameType: GameType,
): number {
  return pointsPerWin * cubeValue * GAME_TYPE_MULTIPLIER[gameType]
}
