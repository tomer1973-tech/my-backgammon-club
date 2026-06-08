'use server'

/**
 * Admin actions — restricted to ADMIN role.
 */

import { revalidatePath }     from 'next/cache'
import { db }                 from '@/lib/db'
import { requireSessionUser } from '@/lib/session'
import type { ActionResult }  from '@/types'

// ── Guard ─────────────────────────────────────────────────────────────────────

async function requireAdmin() {
  const user = await requireSessionUser()
  if (user.role !== 'ADMIN') throw new Error('Forbidden')
  return user
}

// ── Platform stats ────────────────────────────────────────────────────────────

export interface AdminStats {
  totalPlayers:     number
  totalTournaments: number
  totalMatches:     number
  newThisWeek:      number
}

export async function getAdminStats(): Promise<AdminStats> {
  await requireAdmin()
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  const [totalPlayers, totalTournaments, totalMatches, newThisWeek] = await Promise.all([
    db.player.count(),
    db.tournament.count({ where: { deletedAt: null } }),
    db.match.count({ where: { status: 'COMPLETED' } }),
    db.player.count({ where: { createdAt: { gte: weekAgo } } }),
  ])
  return { totalPlayers, totalTournaments, totalMatches, newThisWeek }
}

// ── Player list ───────────────────────────────────────────────────────────────

export interface AdminPlayer {
  id:         string
  name:       string
  email:      string
  role:       string
  avatarUrl:  string | null
  bio:        string | null
  isPrivate:  boolean
  createdAt:  Date
  totalMatches:     number
  totalTournaments: number
  followerCount:    number
}

export async function getAllPlayersAdmin(query?: string): Promise<AdminPlayer[]> {
  await requireAdmin()

  const players = await db.player.findMany({
    where: query?.trim() ? {
      OR: [
        { name:  { contains: query.trim(), mode: 'insensitive' } },
        { email: { contains: query.trim(), mode: 'insensitive' } },
      ],
    } : undefined,
    select: {
      id:        true,
      name:      true,
      email:     true,
      role:      true,
      avatarUrl: true,
      bio:       true,
      isPrivate: true,
      createdAt: true,
      _count:    { select: { followers: true } },
      memberships: {
        select: { wins: true, losses: true },
        where:  { tournament: { deletedAt: null } },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  return players.map(p => {
    const totalWins   = p.memberships.reduce((s, m) => s + m.wins,   0)
    const totalLosses = p.memberships.reduce((s, m) => s + m.losses, 0)
    return {
      id:         p.id,
      name:       p.name,
      email:      p.email,
      role:       p.role,
      avatarUrl:  p.avatarUrl,
      bio:        p.bio,
      isPrivate:  p.isPrivate,
      createdAt:  p.createdAt,
      totalMatches:     totalWins + totalLosses,
      totalTournaments: p.memberships.length,
      followerCount:    p._count.followers,
    }
  })
}

// ── Update player ─────────────────────────────────────────────────────────────

export async function adminUpdatePlayer(
  playerId: string,
  data: { name?: string; role?: string; bio?: string | null; isPrivate?: boolean },
): Promise<ActionResult> {
  await requireAdmin()

  const { name, role, bio, isPrivate } = data

  if (name !== undefined) {
    if (!name.trim())         return { success: false, error: 'Name is required.' }
    if (name.trim().length < 2) return { success: false, error: 'Name too short.' }
    if (name.trim().length > 60) return { success: false, error: 'Name too long.' }
  }

  const validRoles = ['PLAYER', 'TOURNAMENT_MANAGER', 'ADMIN']
  if (role !== undefined && !validRoles.includes(role)) {
    return { success: false, error: 'Invalid role.' }
  }

  await db.player.update({
    where: { id: playerId },
    data: {
      ...(name      !== undefined ? { name: name.trim() } : {}),
      ...(role      !== undefined ? { role: role as 'PLAYER' | 'TOURNAMENT_MANAGER' | 'ADMIN' } : {}),
      ...(bio       !== undefined ? { bio } : {}),
      ...(isPrivate !== undefined ? { isPrivate } : {}),
    },
  })

  revalidatePath('/admin')
  revalidatePath('/players')
  revalidatePath(`/players/${playerId}`)
  return { success: true, data: undefined }
}

// ── Delete player ─────────────────────────────────────────────────────────────

export async function adminDeletePlayer(playerId: string): Promise<ActionResult> {
  const admin = await requireAdmin()

  if (playerId === admin.id) {
    return { success: false, error: 'You cannot delete your own account.' }
  }

  // Remove auth + player in cascade order
  // 1. Null out playerId on tournament memberships (preserves game history as guests)
  await db.tournamentMember.updateMany({
    where: { playerId },
    data:  { playerId: null, guestName: 'Deleted user' },
  })

  // 2. Delete the player record (cascades Follow, MatchLike, FriendGroup, etc.)
  await db.player.delete({ where: { id: playerId } })

  revalidatePath('/admin')
  revalidatePath('/players')
  return { success: true, data: undefined }
}

// ── Reset avatar ──────────────────────────────────────────────────────────────

export async function adminResetAvatar(playerId: string): Promise<ActionResult> {
  await requireAdmin()
  await db.player.update({ where: { id: playerId }, data: { avatarUrl: null } })
  revalidatePath('/admin')
  revalidatePath(`/players/${playerId}`)
  return { success: true, data: undefined }
}
