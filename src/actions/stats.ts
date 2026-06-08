'use server'

import { db }               from '@/lib/db'
import { requireSessionUser, getSessionUser } from '@/lib/session'
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
  tournamentHistory: TournamentEntry[]
}

export async function getMyStats(): Promise<MyStatsData> {
  const user = await requireSessionUser()

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
    tournamentHistory,
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
      memberships: {
        select: { wins: true, losses: true, points: true, tournamentId: true },
      },
      followers: {
        select: { followerId: true },
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
    }
  })
}
