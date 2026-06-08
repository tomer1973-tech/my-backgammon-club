'use server'

import { revalidatePath }       from 'next/cache'
import { db }                   from '@/lib/db'
import { requireSessionUser, getSessionUser } from '@/lib/session'

// ─────────────────────────────────────────────────────────────────────────────
// FOLLOW / UNFOLLOW
// ─────────────────────────────────────────────────────────────────────────────

export async function toggleFollow(
  targetPlayerId: string,
): Promise<{ following: boolean; requested?: boolean }> {
  const user = await requireSessionUser()
  if (user.id === targetPlayerId) throw new Error('Cannot follow yourself')

  const target = await db.player.findUnique({
    where:  { id: targetPlayerId },
    select: { isPrivate: true },
  })

  const existing = await db.follow.findUnique({
    where:  { followerId_followingId: { followerId: user.id, followingId: targetPlayerId } },
    select: { id: true },
  })

  if (existing) {
    await db.follow.delete({ where: { id: existing.id } })
    revalidatePath('/players')
    revalidatePath(`/players/${targetPlayerId}`)
    return { following: false }
  }

  if (target?.isPrivate) {
    await db.followRequest.upsert({
      where:  { fromId_toId: { fromId: user.id, toId: targetPlayerId } },
      update: { status: 'PENDING' },
      create: { fromId: user.id, toId: targetPlayerId },
    })
    return { following: false, requested: true }
  }

  await db.follow.create({ data: { followerId: user.id, followingId: targetPlayerId } })
  revalidatePath('/players')
  revalidatePath(`/players/${targetPlayerId}`)
  return { following: true }
}

// ── Follow requests ───────────────────────────────────────────────────────────

export interface PendingRequest {
  id:         string
  fromId:     string
  fromName:   string
  fromAvatar: string | null
  createdAt:  Date
}

export async function getPendingFollowRequests(): Promise<PendingRequest[]> {
  const user = await requireSessionUser()
  const reqs = await db.followRequest.findMany({
    where:   { toId: user.id, status: 'PENDING' },
    include: { from: { select: { id: true, name: true, avatarUrl: true } } },
    orderBy: { createdAt: 'desc' },
  })
  return reqs.map(r => ({
    id: r.id, fromId: r.fromId, fromName: r.from.name,
    fromAvatar: r.from.avatarUrl, createdAt: r.createdAt,
  }))
}

export async function acceptFollowRequest(requestId: string): Promise<void> {
  const user = await requireSessionUser()
  const req  = await db.followRequest.findUnique({ where: { id: requestId } })
  if (!req || req.toId !== user.id) throw new Error('Not found')
  await db.$transaction([
    db.followRequest.update({ where: { id: requestId }, data: { status: 'ACCEPTED' } }),
    db.follow.upsert({
      where:  { followerId_followingId: { followerId: req.fromId, followingId: req.toId } },
      update: {},
      create: { followerId: req.fromId, followingId: req.toId },
    }),
  ])
  revalidatePath('/players')
  revalidatePath(`/players/${req.fromId}`)
}

export async function declineFollowRequest(requestId: string): Promise<void> {
  const user = await requireSessionUser()
  const req  = await db.followRequest.findUnique({ where: { id: requestId } })
  if (!req || req.toId !== user.id) throw new Error('Not found')
  await db.followRequest.update({ where: { id: requestId }, data: { status: 'DECLINED' } })
}

// ─────────────────────────────────────────────────────────────────────────────
// FOLLOW STATS
// ─────────────────────────────────────────────────────────────────────────────

export async function getFollowStats(
  playerId: string,
): Promise<{ followers: number; following: number; isFollowing: boolean }> {
  const me = await getSessionUser()

  const [followerCount, followingCount, myFollow] = await Promise.all([
    db.follow.count({ where: { followingId: playerId } }),
    db.follow.count({ where: { followerId:  playerId } }),
    me
      ? db.follow.findUnique({
          where: {
            followerId_followingId: {
              followerId:  me.id,
              followingId: playerId,
            },
          },
          select: { id: true },
        })
      : null,
  ])

  return {
    followers:   followerCount,
    following:   followingCount,
    isFollowing: !!myFollow,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MATCH LIKES
// ─────────────────────────────────────────────────────────────────────────────

export async function toggleLike(
  matchId: string,
): Promise<{ liked: boolean; count: number }> {
  const user = await requireSessionUser()

  const existing = await db.matchLike.findUnique({
    where: {
      matchId_playerId: {
        matchId,
        playerId: user.id,
      },
    },
    select: { id: true },
  })

  if (existing) {
    await db.matchLike.delete({ where: { id: existing.id } })
  } else {
    await db.matchLike.create({
      data: { matchId, playerId: user.id },
    })
  }

  const count = await db.matchLike.count({ where: { matchId } })
  return { liked: !existing, count }
}

export async function getMatchLikes(
  matchId: string,
): Promise<{ count: number; likedByMe: boolean }> {
  const me = await getSessionUser()

  const [count, myLike] = await Promise.all([
    db.matchLike.count({ where: { matchId } }),
    me
      ? db.matchLike.findUnique({
          where: {
            matchId_playerId: {
              matchId,
              playerId: me.id,
            },
          },
          select: { id: true },
        })
      : null,
  ])

  return { count, likedByMe: !!myLike }
}

// ─────────────────────────────────────────────────────────────────────────────
// FRIEND GROUPS
// ─────────────────────────────────────────────────────────────────────────────

export interface FriendGroupMemberInfo {
  id:       string  // FriendGroupMember.id
  playerId: string
  name:     string
  email:    string
  avatarUrl: string | null
  joinedAt: Date
}

export interface FriendGroupWithMembers {
  id:        string
  name:      string
  createdAt: Date
  updatedAt: Date
  members:   FriendGroupMemberInfo[]
}

export async function getMyGroups(): Promise<FriendGroupWithMembers[]> {
  const user = await requireSessionUser()

  const groups = await db.friendGroup.findMany({
    where:   { createdById: user.id },
    include: {
      members: {
        include: {
          player: {
            select: { id: true, name: true, email: true, avatarUrl: true },
          },
        },
        orderBy: { joinedAt: 'asc' },
      },
    },
    orderBy: { createdAt: 'asc' },
  })

  return groups.map(g => ({
    id:        g.id,
    name:      g.name,
    createdAt: g.createdAt,
    updatedAt: g.updatedAt,
    members:   g.members.map(m => ({
      id:        m.id,
      playerId:  m.player.id,
      name:      m.player.name,
      email:     m.player.email,
      avatarUrl: m.player.avatarUrl,
      joinedAt:  m.joinedAt,
    })),
  }))
}

export async function createFriendGroup(
  name: string,
): Promise<{ id: string; name: string }> {
  const user = await requireSessionUser()

  const trimmed = name.trim()
  if (!trimmed) throw new Error('Group name is required')
  if (trimmed.length > 60) throw new Error('Group name must be 60 characters or fewer')

  const group = await db.friendGroup.create({
    data:   { name: trimmed, createdById: user.id },
    select: { id: true, name: true },
  })

  revalidatePath('/groups')
  return group
}

export async function deleteFriendGroup(groupId: string): Promise<void> {
  const user = await requireSessionUser()

  await db.friendGroup.deleteMany({
    where: { id: groupId, createdById: user.id },
  })

  revalidatePath('/groups')
}

export async function addToGroup(
  groupId:  string,
  playerId: string,
): Promise<void> {
  const user = await requireSessionUser()

  // Verify group ownership
  const group = await db.friendGroup.findFirst({
    where: { id: groupId, createdById: user.id },
    select: { id: true },
  })
  if (!group) throw new Error('Group not found')

  await db.friendGroupMember.upsert({
    where: {
      groupId_playerId: { groupId, playerId },
    },
    update: {},
    create: { groupId, playerId },
  })

  revalidatePath('/groups')
}

export async function removeFromGroup(
  groupId:  string,
  memberId: string,
): Promise<void> {
  const user = await requireSessionUser()

  // Verify group ownership
  const group = await db.friendGroup.findFirst({
    where: { id: groupId, createdById: user.id },
    select: { id: true },
  })
  if (!group) throw new Error('Group not found')

  await db.friendGroupMember.delete({ where: { id: memberId } })

  revalidatePath('/groups')
}

export async function getGroupMembers(
  groupId: string,
): Promise<FriendGroupMemberInfo[]> {
  const user = await requireSessionUser()

  const group = await db.friendGroup.findFirst({
    where: { id: groupId, createdById: user.id },
    include: {
      members: {
        include: {
          player: {
            select: { id: true, name: true, email: true, avatarUrl: true },
          },
        },
        orderBy: { joinedAt: 'asc' },
      },
    },
  })

  if (!group) throw new Error('Group not found')

  return group.members.map(m => ({
    id:        m.id,
    playerId:  m.player.id,
    name:      m.player.name,
    email:     m.player.email,
    avatarUrl: m.player.avatarUrl,
    joinedAt:  m.joinedAt,
  }))
}

// ─────────────────────────────────────────────────────────────────────────────
// PLAYER SEARCH  (for adding to groups)
// ─────────────────────────────────────────────────────────────────────────────

export interface PlayerSearchResult {
  id:        string
  name:      string
  email:     string
  avatarUrl: string | null
}

export async function searchPlayers(
  query: string,
): Promise<PlayerSearchResult[]> {
  const user = await requireSessionUser()

  if (!query.trim()) return []

  const players = await db.player.findMany({
    where: {
      AND: [
        { id: { not: user.id } },
        {
          OR: [
            { name:  { contains: query.trim(), mode: 'insensitive' } },
            { email: { contains: query.trim(), mode: 'insensitive' } },
          ],
        },
      ],
    },
    select: { id: true, name: true, email: true, avatarUrl: true },
    take:   10,
  })

  return players
}
