'use server'

import { db }            from '@/lib/db'
import { getSessionUser } from '@/lib/session'

export interface FeedMatch {
  id:            string
  tournamentId:  string
  tournamentName: string
  player1Name:   string | null
  player1Avatar: string | null
  player1Id:     string | null
  player2Name:   string | null
  player2Avatar: string | null
  player2Id:     string | null
  winnerName:    string | null
  winnerId:      string | null
  completedAt:   Date
  likeCount:     number
}

export async function getActivityFeed(): Promise<{
  items: FeedMatch[]
  followingCount: number
}> {
  const user = await getSessionUser()

  if (!user) return { items: [], followingCount: 0 }

  // Players I follow
  const follows = await db.follow.findMany({
    where:  { followerId: user.id },
    select: { followingId: true },
  })
  const followedIds = follows.map(f => f.followingId)

  if (followedIds.length === 0) {
    return { items: [], followingCount: 0 }
  }

  // TournamentMember records for followed players
  const memberIds = await db.tournamentMember.findMany({
    where:  { playerId: { in: followedIds } },
    select: { id: true },
  }).then(ms => ms.map(m => m.id))

  // Recent completed matches involving those members
  const matches = await db.match.findMany({
    where: {
      status: 'COMPLETED',
      completedAt: { not: null },
      OR: [
        { player1Id: { in: memberIds } },
        { player2Id: { in: memberIds } },
      ],
    },
    orderBy: { completedAt: 'desc' },
    take: 40,
    select: {
      id:          true,
      completedAt: true,
      tournament: {
        select: { id: true, name: true },
      },
      player1: {
        select: { player: { select: { id: true, name: true, avatarUrl: true } } },
      },
      player2: {
        select: { player: { select: { id: true, name: true, avatarUrl: true } } },
      },
      winner: {
        select: { player: { select: { id: true, name: true } } },
      },
      likes: {
        select: { id: true },
      },
    },
  })

  const items: FeedMatch[] = matches.map(m => ({
    id:             m.id,
    tournamentId:   m.tournament.id,
    tournamentName: m.tournament.name,
    player1Name:    m.player1?.player?.name  ?? null,
    player1Avatar:  m.player1?.player?.avatarUrl ?? null,
    player1Id:      m.player1?.player?.id ?? null,
    player2Name:    m.player2?.player?.name  ?? null,
    player2Avatar:  m.player2?.player?.avatarUrl ?? null,
    player2Id:      m.player2?.player?.id ?? null,
    winnerName:     m.winner?.player?.name   ?? null,
    winnerId:       m.winner?.player?.id ?? null,
    completedAt:    m.completedAt!,
    likeCount:      m.likes.length,
  }))

  return { items, followingCount: followedIds.length }
}
