'use server'

/**
 * Tournament Server Actions
 *
 * All mutations go through here. Every action:
 *  1. Validates input with Zod
 *  2. Requires an authenticated session
 *  3. Checks authorization (ownership/membership)
 *  4. Runs the DB operation
 *  5. Revalidates the appropriate paths
 *  6. Returns ActionResult<T>
 */

import { revalidatePath }            from 'next/cache'
import { redirect }                  from 'next/navigation'
import { db }                        from '@/lib/db'
import { requireSessionUser }        from '@/lib/session'
import {
  createTournamentSchema,
  updateTournamentSchema,
  deleteTournamentSchema,
  archiveTournamentSchema,
  endTournamentSchema,
  updateTournamentStatusSchema,
  joinTournamentSchema,
} from '@/validations'
import type { ActionResult, Tournament, TournamentWithMembers } from '@/types'

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/** Generates a random 6-character alphanumeric join code. */
function generateCode(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase()
}

/** Ensures a unique code by retrying on collisions (rare). */
async function uniqueCode(): Promise<string> {
  let code = generateCode()
  while (await db.tournament.findUnique({ where: { code } })) {
    code = generateCode()
  }
  return code
}

// ─────────────────────────────────────────────────────────────────────────────
// QUERIES — called from Server Components (not Server Actions, no 'use server' needed
// on individual fns because the file-level directive covers them)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns all active (non-deleted) tournaments for the lobby.
 * Enriches each with memberCount, isMember, isOwner, userRole.
 */
export async function getTournaments(): Promise<Tournament[]> {
  const user = await requireSessionUser()

  const rows = await db.tournament.findMany({
    where: {
      deletedAt: null,
      OR: [
        { isPrivate: false },
        { createdById: user.id },
        { members: { some: { playerId: user.id } } },
      ],
    },
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { members: true } },
      members: {
        where:  { playerId: user.id },
        select: { memberRole: true },
      },
    },
  })

  return rows.map(t => ({
    id:           t.id,
    name:         t.name,
    description:  t.description,
    location:     t.location,
    code:         t.code,
    format:       t.format as Tournament['format'],
    status:       t.status as Tournament['status'],
    pointsPerWin: t.pointsPerWin,
    matchLength:  t.matchLength,
    maxPlayers:   t.maxPlayers,
    startDate:    t.startDate,
    createdById:  t.createdById,
    groupId:      t.groupId,
    isPrivate:    t.isPrivate,
    createdAt:    t.createdAt,
    updatedAt:    t.updatedAt,
    deletedAt:    t.deletedAt,
    archivedAt:   t.archivedAt,
    memberCount:  t._count.members,
    isMember:     t.members.length > 0,
    isOwner:      t.createdById === user.id,
    isAdmin:      user.role === 'ADMIN',
    userRole:     t.members[0]?.memberRole as Tournament['userRole'] ?? null,
  }))
}

/** Returns a single tournament with all members. Throws if not found. */
export async function getTournamentWithMembers(id: string): Promise<TournamentWithMembers> {
  const user = await requireSessionUser()

  const t = await db.tournament.findUnique({
    where:   { id, deletedAt: null },
    include: {
      _count: { select: { members: true } },
      members: {
        include: {
          player: { select: { id: true, name: true, email: true, avatarUrl: true } },
        },
        orderBy: { joinedAt: 'asc' },
      },
    },
  })

  if (!t) throw new Error('Tournament not found')

  const myMembership = t.members.find(m => m.playerId === user.id)

  return {
    id:           t.id,
    name:         t.name,
    description:  t.description,
    location:     t.location,
    code:         t.code,
    format:       t.format as Tournament['format'],
    status:       t.status as Tournament['status'],
    pointsPerWin: t.pointsPerWin,
    matchLength:  t.matchLength,
    maxPlayers:   t.maxPlayers,
    startDate:    t.startDate,
    createdById:  t.createdById,
    groupId:      t.groupId,
    isPrivate:    t.isPrivate,
    createdAt:    t.createdAt,
    updatedAt:    t.updatedAt,
    deletedAt:    t.deletedAt,
    archivedAt:   t.archivedAt,
    memberCount:  t._count.members,
    isMember:     !!myMembership,
    isOwner:      t.createdById === user.id,
    isAdmin:      user.role === 'ADMIN',
    userRole:     myMembership?.memberRole as Tournament['userRole'] ?? null,
    members: t.members.map(m => ({
      id:           m.id,
      tournamentId: m.tournamentId,
      playerId:     m.playerId,
      guestName:    m.guestName,
      memberRole:   m.memberRole as import('@/types').MemberRole,
      points:       m.points,
      wins:         m.wins,
      losses:       m.losses,
      joinedAt:     m.joinedAt,
      name:         m.player?.name ?? m.guestName ?? 'Unknown',
      isGuest:      m.playerId === null,
    })),
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MUTATIONS
// ─────────────────────────────────────────────────────────────────────────────

export async function createTournament(
  data: unknown,
): Promise<ActionResult<{ id: string }>> {
  const user = await requireSessionUser()

  const parsed = createTournamentSchema.safeParse(data)
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message }
  }

  const { name, description, location, format, pointsPerWin, matchLength, maxPlayers, startDate } =
    parsed.data

  const code = await uniqueCode()

  const tournament = await db.tournament.create({
    data: {
      name,
      description:  description ?? null,
      location:     location    ?? null,
      format:       format      as import('@prisma/client').TournamentFormat,
      status:       'DRAFT',
      pointsPerWin,
      matchLength:  matchLength ?? null,
      maxPlayers:   maxPlayers  ?? null,
      startDate:    startDate   ? new Date(startDate) : null,
      code,
      createdById:  user.id,
      // Creator automatically becomes an ORGANIZER member
      members: {
        create: {
          playerId:   user.id,
          memberRole: 'ORGANIZER',
        },
      },
    },
    select: { id: true },
  })

  revalidatePath('/')
  return { success: true, data: { id: tournament.id } }
}

export async function joinTournament(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireSessionUser()

  const parsed = joinTournamentSchema.safeParse({
    code: formData.get('code'),
  })
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message }
  }

  const tournament = await db.tournament.findUnique({
    where: { code: parsed.data.code, deletedAt: null },
    select: { id: true, maxPlayers: true, status: true, _count: { select: { members: true } } },
  })

  if (!tournament) {
    return { success: false, error: 'Invalid code — no tournament found.' }
  }
  if (tournament.status === 'COMPLETED' || tournament.status === 'ARCHIVED') {
    return { success: false, error: 'This tournament is no longer accepting new players.' }
  }
  if (tournament.maxPlayers && tournament._count.members >= tournament.maxPlayers) {
    return { success: false, error: 'This tournament is full.' }
  }

  const existing = await db.tournamentMember.findUnique({
    where: {
      unique_member_per_tournament: {
        tournamentId: tournament.id,
        playerId:     user.id,
      },
    },
  })
  if (existing) {
    return { success: false, error: "You're already in this tournament." }
  }

  await db.tournamentMember.create({
    data: {
      tournamentId: tournament.id,
      playerId:     user.id,
      memberRole:   'PARTICIPANT',
    },
  })

  revalidatePath('/')
  revalidatePath(`/tournaments/${tournament.id}`)
  redirect(`/tournaments/${tournament.id}`)
}

export async function deleteTournament(
  data: unknown,
): Promise<ActionResult> {
  const user = await requireSessionUser()

  const parsed = deleteTournamentSchema.safeParse(data)
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message }
  }

  const { tournamentId } = parsed.data

  const tournament = await db.tournament.findUnique({
    where: { id: tournamentId, deletedAt: null },
    select: { createdById: true },
  })

  if (!tournament) return { success: false, error: 'Tournament not found.' }
  if (tournament.createdById !== user.id && user.role !== 'ADMIN') {
    return { success: false, error: 'Only the tournament creator can delete it.' }
  }

  await db.tournament.update({
    where: { id: tournamentId },
    data:  { deletedAt: new Date() },
  })

  revalidatePath('/')
  return { success: true, data: undefined }
}

export async function archiveTournament(
  data: unknown,
): Promise<ActionResult> {
  const user = await requireSessionUser()

  const parsed = archiveTournamentSchema.safeParse(data)
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message }
  }

  const { tournamentId } = parsed.data

  const tournament = await db.tournament.findUnique({
    where: { id: tournamentId, deletedAt: null },
    select: { createdById: true },
  })

  if (!tournament) return { success: false, error: 'Tournament not found.' }
  if (tournament.createdById !== user.id && user.role !== 'ADMIN') {
    return { success: false, error: 'Only the tournament creator can archive it.' }
  }

  await db.tournament.update({
    where: { id: tournamentId },
    data:  { status: 'ARCHIVED', archivedAt: new Date() },
  })

  revalidatePath('/')
  revalidatePath(`/tournaments/${tournamentId}`)
  return { success: true, data: undefined }
}

export async function updateTournamentStatus(
  data: unknown,
): Promise<ActionResult> {
  const user = await requireSessionUser()

  const parsed = updateTournamentStatusSchema.safeParse(data)
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message }
  }

  const { tournamentId, status } = parsed.data

  const tournament = await db.tournament.findUnique({
    where: { id: tournamentId, deletedAt: null },
    select: { createdById: true },
  })

  if (!tournament) return { success: false, error: 'Tournament not found.' }

  const isOrganizer = await db.tournamentMember.findFirst({
    where: { tournamentId, playerId: user.id, memberRole: 'ORGANIZER' },
  })

  if (!isOrganizer && tournament.createdById !== user.id && user.role !== 'ADMIN') {
    return { success: false, error: 'You do not have permission to update this tournament.' }
  }

  await db.tournament.update({
    where: { id: tournamentId },
    data:  {
      status: status as import('@prisma/client').TournamentStatus,
      ...(status === 'ARCHIVED' ? { archivedAt: new Date() } : {}),
    },
  })

  revalidatePath('/')
  revalidatePath(`/tournaments/${tournamentId}`)
  return { success: true, data: undefined }
}

// ─────────────────────────────────────────────────────────────────────────────
// END TOURNAMENT
// Marks an active tournament as COMPLETED and closes (voids) any matches that
// are still PENDING or ACTIVE — they're removed without affecting standings,
// the same way `abandonMatch` works for a single match.
// ─────────────────────────────────────────────────────────────────────────────

export async function updateTournament(
  data: unknown,
): Promise<ActionResult> {
  const user = await requireSessionUser()

  const parsed = updateTournamentSchema.safeParse(data)
  if (!parsed.success) return { success: false, error: parsed.error.errors[0].message }

  const { tournamentId, name, description, location, pointsPerWin, matchLength, maxPlayers, startDate } = parsed.data

  const tournament = await db.tournament.findUnique({
    where: { id: tournamentId, deletedAt: null },
    select: { createdById: true },
  })
  if (!tournament) return { success: false, error: 'Tournament not found.' }

  const isOrganizer = await db.tournamentMember.findFirst({
    where: { tournamentId, playerId: user.id, memberRole: 'ORGANIZER' },
  })
  if (!isOrganizer && tournament.createdById !== user.id && user.role !== 'ADMIN') {
    return { success: false, error: 'You do not have permission to edit this tournament.' }
  }

  await db.tournament.update({
    where: { id: tournamentId },
    data: {
      name,
      description:  description ?? null,
      location:     location    ?? null,
      pointsPerWin,
      matchLength:  matchLength ?? null,
      maxPlayers:   maxPlayers  ?? null,
      startDate:    startDate   ? new Date(startDate) : null,
    },
  })

  revalidatePath('/')
  revalidatePath(`/tournaments/${tournamentId}`)
  redirect(`/tournaments/${tournamentId}`)
}

export async function endTournament(
  data: unknown,
): Promise<ActionResult<{ closedMatches: number }>> {
  const user = await requireSessionUser()

  const parsed = endTournamentSchema.safeParse(data)
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message }
  }

  const { tournamentId } = parsed.data

  const tournament = await db.tournament.findUnique({
    where: { id: tournamentId, deletedAt: null },
    select: { createdById: true, status: true },
  })

  if (!tournament) return { success: false, error: 'Tournament not found.' }

  const isOrganizer = await db.tournamentMember.findFirst({
    where: { tournamentId, playerId: user.id, memberRole: 'ORGANIZER' },
  })

  if (!isOrganizer && tournament.createdById !== user.id && user.role !== 'ADMIN') {
    return { success: false, error: 'You do not have permission to end this tournament.' }
  }

  if (tournament.status === 'COMPLETED' || tournament.status === 'ARCHIVED') {
    return { success: false, error: 'This tournament has already ended.' }
  }

  // Close out any matches that never finished — delete them like abandonMatch,
  // so standings (wins/losses/points) aren't affected by unplayed games.
  const unfinished = await db.match.findMany({
    where:  { tournamentId, status: { in: ['PENDING', 'ACTIVE'] } },
    select: { id: true },
  })

  if (unfinished.length > 0) {
    await db.match.deleteMany({
      where: { id: { in: unfinished.map(m => m.id) } },
    })
  }

  await db.tournament.update({
    where: { id: tournamentId },
    data:  { status: 'COMPLETED' },
  })

  revalidatePath('/')
  revalidatePath(`/tournaments/${tournamentId}`)
  revalidatePath(`/tournaments/${tournamentId}/matches`)
  revalidatePath('/schedule')
  return { success: true, data: { closedMatches: unfinished.length } }
}
