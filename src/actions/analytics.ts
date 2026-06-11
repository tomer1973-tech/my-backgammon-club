'use server'

import { db }                        from '@/lib/db'
import {
  computePlayerAnalytics,
  computeTournamentSnapshot,
  computeOpeningStats,
  computeMomentumPlayers,
  recommendNextMatch,
  buildWinRateTimeline,
  type AnalyticsMatch,
  type AnalyticsGame,
  type AnalyticsMember,
  type PlayerAnalytics,
  type TournamentSnapshot,
  type OpeningStats,
  type MomentumPlayer,
  type MatchRecommendation,
} from '@/lib/analytics'

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS — fetch tournament raw data
// ─────────────────────────────────────────────────────────────────────────────

async function fetchTournamentRawData(tournamentId: string) {
  const [memberRows, matchRows, gameRows] = await Promise.all([
    db.tournamentMember.findMany({
      where: { tournamentId },
      include: { player: { select: { name: true } } },
      orderBy: { joinedAt: 'asc' },
    }),
    db.match.findMany({
      // Only matches with both players decided — TBD bracket slots have no
      // analytic value.
      where: { tournamentId, player1Id: { not: null }, player2Id: { not: null } },
      include: {
        player1: { select: { player: { select: { name: true } }, guestName: true } },
        player2: { select: { player: { select: { name: true } }, guestName: true } },
      },
      orderBy: { createdAt: 'asc' },
    }),
    db.matchGame.findMany({
      where: { match: { tournamentId } },
    }),
  ])

  const members: AnalyticsMember[] = memberRows.map(m => ({
    id:      m.id,
    name:    m.player?.name ?? m.guestName ?? 'Unknown',
    isGuest: m.playerId === null,
    wins:    m.wins,
    losses:  m.losses,
    points:  m.points,
  }))

  const matches: AnalyticsMatch[] = matchRows.map(m => ({
    id:           m.id,
    player1Id:    m.player1Id!,   // filtered to non-null above
    player2Id:    m.player2Id!,
    player1Name:  m.player1?.player?.name ?? m.player1?.guestName ?? 'Unknown',
    player2Name:  m.player2?.player?.name ?? m.player2?.guestName ?? 'Unknown',
    player1Score: m.player1Score,
    player2Score: m.player2Score,
    targetScore:  m.targetScore,
    winnerId:     m.winnerId,
    status:       m.status as 'PENDING' | 'ACTIVE' | 'COMPLETED',
    openingType:  m.openingType,
    duration:     m.duration,
    createdAt:    m.createdAt,
  }))

  const games: AnalyticsGame[] = gameRows.map(g => ({
    matchId:       g.matchId,
    winnerId:      g.winnerId,
    loserId:       g.loserId,
    cubeValue:     g.cubeValue,
    gameType:      g.gameType as 'NORMAL' | 'GAMMON' | 'BACKGAMMON',
    pointsAwarded: g.pointsAwarded,
  }))

  return { members, matches, games }
}

// ─────────────────────────────────────────────────────────────────────────────
// TOURNAMENT ANALYTICS — used by the analytics dashboard page
// ─────────────────────────────────────────────────────────────────────────────

export interface TournamentAnalyticsData {
  snapshot:        TournamentSnapshot
  openingStats:    OpeningStats[]
  momentumPlayers: MomentumPlayer[]
  recommendation:  MatchRecommendation | null
}

export async function getTournamentAnalytics(tournamentId: string): Promise<TournamentAnalyticsData> {
  const { members, matches, games } = await fetchTournamentRawData(tournamentId)

  // Active player IDs (currently in a match)
  const activePairIds = new Set<string>(
    matches
      .filter(m => m.status === 'ACTIVE')
      .flatMap(m => [m.player1Id, m.player2Id]),
  )

  const snapshot        = computeTournamentSnapshot(members.length, matches, games)
  const openingStats    = computeOpeningStats(matches)
  const momentumPlayers = computeMomentumPlayers(members, matches, 3)
  const recommendation  = recommendNextMatch(members, matches, activePairIds)

  return { snapshot, openingStats, momentumPlayers, recommendation }
}

// ─────────────────────────────────────────────────────────────────────────────
// PLAYER ANALYTICS — used by the player profile page
// ─────────────────────────────────────────────────────────────────────────────

export interface PlayerAnalyticsData {
  analytics:   PlayerAnalytics
  winRateChart: { match: number; date: string; cumulativeWins: number; winRate: number }[]
}

export async function getPlayerAnalytics(
  tournamentId: string,
  memberId:     string,
): Promise<PlayerAnalyticsData> {
  const { members, matches, games } = await fetchTournamentRawData(tournamentId)

  const member = members.find(m => m.id === memberId)
  if (!member) throw new Error('Member not found')

  const analytics   = computePlayerAnalytics(memberId, member.name, matches, games, member.points)
  const winRateChart = buildWinRateTimeline(analytics.timeline)

  return { analytics, winRateChart }
}
