'use server'

import { db }               from '@/lib/db'
import { requireSessionUser, getSessionUser } from '@/lib/session'
import { computePlayerAnalytics, buildWinRateTimeline } from '@/lib/analytics'
import type { AnalyticsMatch, AnalyticsGame } from '@/lib/analytics'
import type { TournamentFormat, TournamentStatus } from '@/types'

// ─────────────────────────────────────────────────────────────────────────────
// MY STATS  (cross-tournament personal stats for the logged-in player)
// ─────────────────────────────────────────────────────────────────────────────

export interface TournamentEntry {
  id:           string
  name:         string
  status:       TournamentStatus
  format:       TournamentFormat
  wins:         number
  losses:       number
  points:       number
  rank:         number
  totalMembers: number
  winRate:      number
  joinedAt:     Date
}

export interface MyStatsData {
  totalTournaments: number
  totalMatches:     number
  totalWins:        number
  totalLosses:      number
  totalPoints:      number
  winRate:          number   // 0–100
  quickWins:        number
  quickLosses:      number
  tournamentHistory: TournamentEntry[]
}

export async function getMyStats(): Promise<MyStatsData> {
  const user = await requireSessionUser()

  // Fetch player quick game stats
  const playerRow = await db.player.findUnique({
    where: { id: user.id },
    select: { quickWins: true, quickLosses: true },
  })

  // Fetch all memberships (excluding soft-deleted tournaments)
  const memberships = await db.tournamentMember.findMany({
    where: { playerId: user.id },
    include: {
      tournament: {
        select: {
          id:       true,
          name:     true,
          status:   true,
          format:   true,
          deletedAt: true,
        },
      },
    },
    orderBy: { joinedAt: 'desc' },
  })

  const active = memberships.filter(m => !m.tournament.deletedAt)

  // Batch-fetch all members of the same tournaments (for rank computation)
  const tournamentIds = [...new Set(active.map(m => m.tournamentId))]
  const allMembers = tournamentIds.length > 0
    ? await db.tournamentMember.findMany({
        where: { tournamentId: { in: tournamentIds } },
        select: { tournamentId: true, points: true },
      })
    : []

  // Group points by tournamentId
  const pointsByTournament: Record<string, number[]> = {}
  for (const m of allMembers) {
    ;(pointsByTournament[m.tournamentId] ??= []).push(m.points)
  }

  const totalWins   = active.reduce((s, m) => s + m.wins,   0)
  const totalLosses = active.reduce((s, m) => s + m.losses, 0)
  const totalMatches = totalWins + totalLosses
  const totalPoints  = active.reduce((s, m) => s + m.points, 0)
  const winRate      = totalMatches > 0 ? Math.round((totalWins / totalMatches) * 100) : 0

  const tournamentHistory: TournamentEntry[] = active.map(m => {
    const allPts     = pointsByTournament[m.tournamentId] ?? []
    const rank       = allPts.filter(p => p > m.points).length + 1
    const matchesHere = m.wins + m.losses
    return {
      id:           m.tournament.id,
      name:         m.tournament.name,
      status:       m.tournament.status as TournamentStatus,
      format:       m.tournament.format as TournamentFormat,
      wins:         m.wins,
      losses:       m.losses,
      points:       m.points,
      rank,
      totalMembers: allPts.length,
      winRate:      matchesHere > 0 ? Math.round((m.wins / matchesHere) * 100) : 0,
      joinedAt:     m.joinedAt,
    }
  })

  return {
    totalTournaments: active.length,
    totalMatches,
    totalWins,
    totalLosses,
    totalPoints,
    winRate,
    quickWins:   playerRow?.quickWins   ?? 0,
    quickLosses: playerRow?.quickLosses ?? 0,
    tournamentHistory,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MY DETAILED STATS — cross-tournament breakdown (streaks, cube/gammon rates,
// opening performance, head-to-head, win-rate timeline). Reuses the same
// pure analytics engine as the per-tournament player analytics view: every
// completed match across every tournament this player has been a member of
// is gathered, the player's own membership id in each tournament is relabeled
// to a single synthetic id ("ME"), then computePlayerAnalytics does the rest.
// ─────────────────────────────────────────────────────────────────────────────

export interface MyDetailedStats {
  analytics:    ReturnType<typeof computePlayerAnalytics>
  winRateChart: ReturnType<typeof buildWinRateTimeline>
}

export async function getMyDetailedStats(): Promise<MyDetailedStats> {
  const user = await requireSessionUser()

  const myMemberships = await db.tournamentMember.findMany({
    where:  { playerId: user.id },
    select: { id: true, points: true },
  })
  const myMemberIds = new Set(myMemberships.map(m => m.id))
  const totalPoints = myMemberships.reduce((s, m) => s + m.points, 0)

  if (myMemberIds.size === 0) {
    const analytics = computePlayerAnalytics('ME', user.name, [], [], 0)
    return { analytics, winRateChart: buildWinRateTimeline(analytics.timeline) }
  }

  const matchRows = await db.match.findMany({
    where: {
      status: 'COMPLETED',
      OR: [
        { player1Id: { in: [...myMemberIds] } },
        { player2Id: { in: [...myMemberIds] } },
      ],
    },
    include: {
      player1: { select: { player: { select: { name: true } }, guestName: true } },
      player2: { select: { player: { select: { name: true } }, guestName: true } },
    },
    orderBy: { createdAt: 'asc' },
  })

  const matchIds = matchRows.map(m => m.id)
  const gameRows = matchIds.length > 0
    ? await db.matchGame.findMany({ where: { matchId: { in: matchIds } } })
    : []

  const relabel = (id: string | null) => (id && myMemberIds.has(id) ? 'ME' : id)

  const matches: AnalyticsMatch[] = matchRows.map(m => ({
    id:           m.id,
    player1Id:    relabel(m.player1Id)!,
    player2Id:    relabel(m.player2Id)!,
    player1Name:  m.player1?.player?.name ?? m.player1?.guestName ?? 'Unknown',
    player2Name:  m.player2?.player?.name ?? m.player2?.guestName ?? 'Unknown',
    player1Score: m.player1Score,
    player2Score: m.player2Score,
    targetScore:  m.targetScore,
    winnerId:     relabel(m.winnerId),
    status:       m.status as 'PENDING' | 'ACTIVE' | 'COMPLETED',
    openingType:  m.openingType,
    duration:     m.duration,
    createdAt:    m.createdAt,
  }))

  const games: AnalyticsGame[] = gameRows.map(g => ({
    matchId:       g.matchId,
    winnerId:      relabel(g.winnerId)!,
    loserId:       relabel(g.loserId)!,
    cubeValue:     g.cubeValue,
    gameType:      g.gameType,
    pointsAwarded: g.pointsAwarded,
  }))

  const analytics    = computePlayerAnalytics('ME', user.name, matches, games, totalPoints)
  const winRateChart = buildWinRateTimeline(analytics.timeline)

  return { analytics, winRateChart }
}

// ─────────────────────────────────────────────────────────────────────────────
// LOBBY HEADER — compact live data for the home hero: rating, current streak,
// win rate, and the player's most recent completed matches (for the hero stat
// ribbon + "Recent matches" list). Reuses the detailed-stats analytics engine.
// ─────────────────────────────────────────────────────────────────────────────

export interface LobbyRecentMatch {
  opponentName: string
  win:          boolean
  score:        string   // "7–4"
  date:         string   // "Jan 5"
}

export interface LobbyHeader {
  rating:        number
  ratedGames:    number
  winRate:       number   // 0–100
  totalMatches:  number
  streakCount:   number
  streakType:    'win' | 'loss' | null
  recentMatches: LobbyRecentMatch[]
}

export async function getLobbyHeader(): Promise<LobbyHeader> {
  const user = await requireSessionUser()

  const [player, detailed] = await Promise.all([
    db.player.findUnique({ where: { id: user.id }, select: { rating: true, ratedGames: true } }),
    getMyDetailedStats(),
  ])

  const a = detailed.analytics
  const recentMatches: LobbyRecentMatch[] = [...a.timeline]
    .reverse()
    .slice(0, 4)
    .map(t => ({
      opponentName: t.opponentName,
      win:          t.win,
      score:        t.score,
      date:         t.date,
    }))

  return {
    rating:        player?.rating ?? 1500,
    ratedGames:    player?.ratedGames ?? 0,
    winRate:       a.winRate,
    totalMatches:  a.totalMatches,
    streakCount:   a.currentStreak.count,
    streakType:    a.currentStreak.type,
    recentMatches,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ALL PLAYERS  (platform roster — for the /players page)
// ─────────────────────────────────────────────────────────────────────────────

export interface PlayerRow {
  id:               string
  name:             string
  email:            string
  avatarUrl:        string | null
  role:             string
  joinedAt:         Date
  totalTournaments: number
  totalMatches:     number
  totalWins:        number
  totalLosses:      number
  totalPoints:      number
  winRate:          number
  followerCount:    number
  isFollowing:      boolean
  isFriend:         boolean
  rating:           number
  ratedGames:       number
}

export async function getAllPlayers(): Promise<PlayerRow[]> {
  const me = await getSessionUser()
  if (!me) {
    // Fallback: require session (will throw if unauthed)
    await requireSessionUser()
  }

  const players = await db.player.findMany({
    select: {
      id:        true,
      name:      true,
      email:     true,
      avatarUrl: true,
      role:      true,
      createdAt: true,
      rating:    true,
      ratedGames: true,
      memberships: {
        select: { wins: true, losses: true, points: true, tournamentId: true },
      },
      followers: {
        select: { followerId: true },
      },
      following: {
        select: { followingId: true },
      },
    },
    orderBy: { createdAt: 'asc' },
  })

  return players.map(p => {
    const totalWins    = p.memberships.reduce((s, m) => s + m.wins,   0)
    const totalLosses  = p.memberships.reduce((s, m) => s + m.losses, 0)
    const totalMatches = totalWins + totalLosses
    const followerCount = p.followers.length
    const isFollowing   = me ? p.followers.some(f => f.followerId === me.id) : false
    const isFriend       = me ? isFollowing && p.following.some(f => f.followingId === me.id) : false
    return {
      id:               p.id,
      name:             p.name,
      email:            p.email,
      avatarUrl:        p.avatarUrl,
      role:             p.role,
      joinedAt:         p.createdAt,
      totalTournaments: p.memberships.length,
      totalMatches,
      totalWins,
      totalLosses,
      totalPoints:      p.memberships.reduce((s, m) => s + m.points, 0),
      winRate:          totalMatches > 0 ? Math.round((totalWins / totalMatches) * 100) : 0,
      followerCount,
      isFollowing,
      isFriend,
      rating:     p.rating,
      ratedGames: p.ratedGames,
    }
  })
}
