'use server'

/**
 * Player / Member Server Actions
 *
 * Handles adding, removing, and managing players within tournaments.
 * All actions validate input with Zod and check authorization.
 */

import { revalidatePath }     from 'next/cache'
import { db }                 from '@/lib/db'
import { requireSessionUser } from '@/lib/session'
import {
  addRegisteredMemberSchema,
  addGuestMemberSchema,
  removeMemberSchema,
  updateMemberRoleSchema,
} from '@/validations'
import type { ActionResult, Player } from '@/types'

// ─────────────────────────────────────────────────────────────────────────────
// AUTHORIZATION HELPER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns true if the current user can manage this tournament's roster.
 * Condition: user is ADMIN, or created the tournament, or is an ORGANIZER member.
 */
async function canManageTournament(tournamentId: string, userId: string, userRole: string): Promise<boolean> {
  if (userRole === 'ADMIN') return true

  const tournament = await db.tournament.findUnique({
    where: { id: tournamentId, deletedAt: null },
    select: { createdById: true },
  })
  if (!tournament) return false
  if (tournament.createdById === userId) return true

  const membership = await db.tournamentMember.findFirst({
    where: { tournamentId, playerId: userId, memberRole: 'ORGANIZER' },
  })
  return !!membership
}

// ─────────────────────────────────────────────────────────────────────────────
// SEARCH
// ─────────────────────────────────────────────────────────────────────────────

/** Search registered players by name or email (excludes existing members). */
export async function searchPlayers(
  tournamentId: string,
  query: string,
): Promise<ActionResult<Player[]>> {
  await requireSessionUser()

  if (!query.trim() || query.trim().length < 2) {
    return { success: true, data: [] }
  }

  // Find players already in the tournament
  const existingMembers = await db.tournamentMember.findMany({
    where:  { tournamentId, playerId: { not: null } },
    select: { playerId: true },
  })
  const existingPlayerIds = existingMembers
    .map(m => m.playerId)
    .filter(Boolean) as string[]

  const players = await db.player.findMany({
    where: {
      AND: [
        {
          OR: [
            { name:  { contains: query, mode: 'insensitive' } },
            { email: { contains: query, mode: 'insensitive' } },
          ],
        },
        { id: { notIn: existingPlayerIds } },
      ],
    },
    select: { id: true, name: true, email: true, role: true, avatarUrl: true },
    take: 10,
  })

  return {
    success: true,
    data: players.map(p => ({
      id:        p.id,
      name:      p.name,
      email:     p.email,
      role:      p.role as Player['role'],
      avatarUrl: p.avatarUrl,
    })),
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ADD MEMBERS
// ─────────────────────────────────────────────────────────────────────────────

export async function addMemberByEmail(
  data: unknown,
): Promise<ActionResult> {
  const user = await requireSessionUser()

  const parsed = addRegisteredMemberSchema.safeParse(data)
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message }
  }

  const { tournamentId, email } = parsed.data

  // Any logged-in user may add players
  const tournament = await db.tournament.findUnique({
    where:  { id: tournamentId, deletedAt: null },
    select: { maxPlayers: true, _count: { select: { members: true } } },
  })
  if (!tournament) return { success: false, error: 'Tournament not found.' }
  if (tournament.maxPlayers && tournament._count.members >= tournament.maxPlayers) {
    return { success: false, error: 'Tournament is full.' }
  }

  const player = await db.player.findUnique({
    where:  { email },
    select: { id: true, name: true },
  })
  if (!player) {
    return { success: false, error: `No account found for ${email}.` }
  }

  const existing = await db.tournamentMember.findUnique({
    where: {
      unique_member_per_tournament: {
        tournamentId,
        playerId: player.id,
      },
    },
  })
  if (existing) {
    return { success: false, error: `${player.name} is already in this tournament.` }
  }

  await db.tournamentMember.create({
    data: {
      tournamentId,
      playerId:   player.id,
      memberRole: 'PARTICIPANT',
    },
  })

  revalidatePath(`/tournaments/${tournamentId}`)
  revalidatePath(`/tournaments/${tournamentId}/players`)
  return { success: true, data: undefined }
}

export async function addGuestMember(
  data: unknown,
): Promise<ActionResult> {
  const user = await requireSessionUser()

  const parsed = addGuestMemberSchema.safeParse(data)
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message }
  }

  const { tournamentId, guestName } = parsed.data

  // Any logged-in user may add players
  const tournament = await db.tournament.findUnique({
    where:  { id: tournamentId, deletedAt: null },
    select: { maxPlayers: true, _count: { select: { members: true } } },
  })
  if (!tournament) return { success: false, error: 'Tournament not found.' }
  if (tournament.maxPlayers && tournament._count.members >= tournament.maxPlayers) {
    return { success: false, error: 'Tournament is full.' }
  }

  // Prevent duplicate guest names in the same tournament
  const dupGuest = await db.tournamentMember.findFirst({
    where: {
      tournamentId,
      guestName: { equals: guestName, mode: 'insensitive' },
    },
  })
  if (dupGuest) {
    return { success: false, error: `A guest named "${guestName}" is already in this tournament.` }
  }

  await db.tournamentMember.create({
    data: {
      tournamentId,
      guestName,
      memberRole: 'PARTICIPANT',
    },
  })

  revalidatePath(`/tournaments/${tournamentId}`)
  revalidatePath(`/tournaments/${tournamentId}/players`)
  return { success: true, data: undefined }
}

// ─────────────────────────────────────────────────────────────────────────────
// REMOVE MEMBER
// ─────────────────────────────────────────────────────────────────────────────

export async function removeMember(
  data: unknown,
): Promise<ActionResult> {
  const user = await requireSessionUser()

  const parsed = removeMemberSchema.safeParse(data)
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message }
  }

  const { memberId, tournamentId } = parsed.data

  if (!await canManageTournament(tournamentId, user.id, user.role)) {
    return { success: false, error: 'You do not have permission to remove players.' }
  }

  const member = await db.tournamentMember.findUnique({
    where: { id: memberId },
    include: { _count: { select: { gamesWon: true, gamesLost: true } } },
  })

  if (!member || member.tournamentId !== tournamentId) {
    return { success: false, error: 'Member not found.' }
  }

  // Prevent removing players who have recorded games (would break history)
  const hasGames = member._count.gamesWon > 0 || member._count.gamesLost > 0
  if (hasGames) {
    return {
      success: false,
      error: 'Cannot remove a player with recorded games. Archive the tournament instead.',
    }
  }

  await db.tournamentMember.delete({ where: { id: memberId } })

  revalidatePath(`/tournaments/${tournamentId}`)
  revalidatePath(`/tournaments/${tournamentId}/players`)
  return { success: true, data: undefined }
}

// ─────────────────────────────────────────────────────────────────────────────
// UPDATE MEMBER ROLE
// ─────────────────────────────────────────────────────────────────────────────

export async function updateMemberRole(
  data: unknown,
): Promise<ActionResult> {
  const user = await requireSessionUser()

  const parsed = updateMemberRoleSchema.safeParse(data)
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message }
  }

  const { memberId, role } = parsed.data

  const member = await db.tournamentMember.findUnique({
    where:  { id: memberId },
    select: { tournamentId: true, playerId: true },
  })
  if (!member) return { success: false, error: 'Member not found.' }

  // Only guest-less members (registered players) can be organizers
  if (role === 'ORGANIZER' && !member.playerId) {
    return { success: false, error: 'Guest players cannot be organizers.' }
  }

  if (!await canManageTournament(member.tournamentId, user.id, user.role)) {
    return { success: false, error: 'You do not have permission to update member roles.' }
  }

  await db.tournamentMember.update({
    where: { id: memberId },
    data:  { memberRole: role as import('@prisma/client').MemberRole },
  })

  revalidatePath(`/tournaments/${member.tournamentId}`)
  revalidatePath(`/tournaments/${member.tournamentId}/players`)
  return { success: true, data: undefined }
}
