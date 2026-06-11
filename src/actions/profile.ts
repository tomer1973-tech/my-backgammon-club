'use server'

/**
 * Profile actions — public player profile data.
 */

import { db }              from '@/lib/db'
import { getSessionUser }  from '@/lib/session'
import type { ActionResult } from '@/types'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PublicPlayerProfile {
  id:         string
  name:       string
  email:      string
  avatarUrl:  string | null
  bio:        string | null
  isPrivate:  boolean
  role:       string
  joinedAt:   Date

  // Stats
  totalMatches:     number
  totalWins:        number
  totalLosses:      number
  totalPoints:      number
  totalTournaments: number
  winRate:          number   // 0–100

  // Social
  followerCount:  number
  followingCount: number
  isFollowing:    boolean   // does the viewer follow this person?
  isFriend:       boolean   // mutual follow
  followRequestSent: boolean // viewer sent a pending request

  // Recent completed matches (last 8)
  recentMatches: RecentMatch[]
}

export interface RecentMatch {
  id:           string
  tournamentId: string
  tournamentName: string
  opponentName: string
  opponentAvatar: string | null
  result:       'win' | 'loss'
  score:        string   // e.g. "7–5"
  playedAt:     Date
}

export interface FollowListItem {
  id:        string
  name:      string
  avatarUrl: string | null
  isFollowing: boolean   // does the viewer follow them?
  isFriend:    boolean
}

// ── Actions ───────────────────────────────────────────────────────────────────

export async function getPlayerProfile(
  playerId: string,
): Promise<PublicPlayerProfile | null> {
  const me = await getSessionUser()

  const player = await db.player.findUnique({
    where:  { id: playerId },
    select: {
      id:        true,
      name:      true,
      email:     true,
      avatarUrl: true,
      bio:       true,
      isPrivate: true,
      role:      true,
      createdAt: true,
      memberships: {
        where: { tournament: { deletedAt: null } },
        select: { wins: true, losses: true, points: true },
      },
      followers: { select: { followerId: true } },
      following: { select: { followingId: true } },
      followRequestsReceived: me
        ? { where: { fromId: me.id, status: 'PENDING' }, select: { id: true } }
        : undefined,
    },
  })

  if (!player) return null

  const totalWins        = player.memberships.reduce((s, m) => s + m.wins,   0)
  const totalLosses      = player.memberships.reduce((s, m) => s + m.losses, 0)
  const totalPoints      = player.memberships.reduce((s, m) => s + m.points, 0)
  const totalMatches     = totalWins + totalLosses
  const totalTournaments = player.memberships.length
  const winRate          = totalMatches > 0 ? Math.round((totalWins / totalMatches) * 100) : 0

  const followerIds  = player.followers.map(f => f.followerId)
  const followingIds = player.following.map(f => f.followingId)
  const isFollowing  = me ? followerIds.includes(me.id) : false
  const isFriend     = me ? (isFollowing && followingIds.includes(me.id)) : false
  const followRequestSent = me ? (player.followRequestsReceived?.length ?? 0) > 0 : false

  // Recent matches
  const memberIds = (await db.tournamentMember.findMany({
    where:  { playerId },
    select: { id: true },
  })).map(m => m.id)

  const recentMatchRows = memberIds.length > 0
    ? await db.match.findMany({
        where: {
          status: 'COMPLETED',
          OR: [{ player1Id: { in: memberIds } }, { player2Id: { in: memberIds } }],
        },
        select: {
          id:          true,
          tournamentId: true,
          player1Score: true,
          player2Score: true,
          completedAt:  true,
          tournament:  { select: { name: true } },
          player1:     { select: { id: true, guestName: true, player: { select: { name: true, avatarUrl: true } } } },
          player2:     { select: { id: true, guestName: true, player: { select: { name: true, avatarUrl: true } } } },
          winner:      { select: { id: true } },
        },
        orderBy: { completedAt: 'desc' },
        take:    8,
      })
    : []

  const recentMatches: RecentMatch[] = recentMatchRows.map(m => {
    // Completed matches always have both players set (asserted via !).
    const p1isMe = memberIds.includes(m.player1!.id)
    const myMember  = (p1isMe ? m.player1 : m.player2)!
    const oppMember = (p1isMe ? m.player2 : m.player1)!
    const myScore   = p1isMe ? m.player1Score : m.player2Score
    const oppScore  = p1isMe ? m.player2Score : m.player1Score
    const opponentName   = oppMember.player?.name ?? oppMember.guestName ?? 'Unknown'
    const opponentAvatar = oppMember.player?.avatarUrl ?? null
    const result = m.winner?.id === myMember.id ? 'win' : 'loss'
    return {
      id:             m.id,
      tournamentId:   m.tournamentId,
      tournamentName: m.tournament.name,
      opponentName,
      opponentAvatar,
      result,
      score:    `${myScore}–${oppScore}`,
      playedAt: m.completedAt ?? new Date(),
    }
  })

  return {
    id:               player.id,
    name:             player.name,
    email:            player.email,
    avatarUrl:        player.avatarUrl,
    bio:              player.bio,
    isPrivate:        player.isPrivate,
    role:             player.role,
    joinedAt:         player.createdAt,
    totalMatches,
    totalWins,
    totalLosses,
    totalPoints,
    totalTournaments,
    winRate,
    followerCount:  followerIds.length,
    followingCount: followingIds.length,
    isFollowing,
    isFriend,
    followRequestSent,
    recentMatches,
  }
}

export async function getFollowersList(playerId: string): Promise<FollowListItem[]> {
  const me = await getSessionUser()

  const follows = await db.follow.findMany({
    where:   { followingId: playerId },
    select:  { follower: { select: { id: true, name: true, avatarUrl: true, following: { select: { followingId: true } } } } },
    orderBy: { createdAt: 'desc' },
  })

  return follows.map(f => {
    const p          = f.follower
    const myFollowingIds = me ? (p.following.map(x => x.followingId)) : []
    const iFollowThem = me ? p.following.some(x => x.followingId === me.id) : false
    return {
      id:          p.id,
      name:        p.name,
      avatarUrl:   p.avatarUrl,
      isFollowing: iFollowThem,
      isFriend:    me ? (iFollowThem && follows.some(x => x.follower.id === me.id && playerId === p.id)) : false,
    }
  })
}

export async function getFollowingList(playerId: string): Promise<FollowListItem[]> {
  const me = await getSessionUser()

  const follows = await db.follow.findMany({
    where:   { followerId: playerId },
    select:  {
      following: {
        select: {
          id: true, name: true, avatarUrl: true,
          followers: { select: { followerId: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  // IDs that follow back the subject
  const followerIdsOfSubject = (await db.follow.findMany({
    where:  { followingId: playerId },
    select: { followerId: true },
  })).map(f => f.followerId)

  return follows.map(f => {
    const p = f.following
    const viewerFollowsThem = me ? p.followers.some(x => x.followerId === me.id) : false
    const isFriend = followerIdsOfSubject.includes(p.id)
    return {
      id:          p.id,
      name:        p.name,
      avatarUrl:   p.avatarUrl,
      isFollowing: viewerFollowsThem,
      isFriend,
    }
  })
}

// ── Update profile (bio + privacy) ───────────────────────────────────────────

import { requireSessionUser } from '@/lib/session'
import { revalidatePath }     from 'next/cache'

export async function updateProfileDetails(
  _prev: ActionResult<{ saved: boolean } | undefined>,
  formData: FormData,
): Promise<ActionResult<{ saved: boolean } | undefined>> {
  const user = await requireSessionUser()

  const name      = (formData.get('name')      as string | null)?.trim() ?? ''
  const bio       = (formData.get('bio')       as string | null)?.trim() ?? ''
  const isPrivate = formData.get('isPrivate') === 'true'

  if (!name)           return { success: false, error: 'Name is required.' }
  if (name.length < 2) return { success: false, error: 'Name must be at least 2 characters.' }
  if (name.length > 60) return { success: false, error: 'Name must be 60 characters or fewer.' }
  if (bio.length > 200) return { success: false, error: 'Bio must be 200 characters or fewer.' }

  await db.player.update({
    where: { id: user.id },
    data:  { name, bio: bio || null, isPrivate },
  })

  revalidatePath('/settings')
  revalidatePath(`/players/${user.id}`)
  return { success: true, data: { saved: true } }
}
