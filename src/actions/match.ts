'use server'

/**
 * Match Engine — Server Actions
 *
 * Implements the complete backgammon match lifecycle:
 *   createMatch → startMatch → [recordGameInMatch | acceptDouble | declineDouble]* → completeMatch
 *
 * Doubling cube rules:
 *   - Cube starts at 1, in the center (either player may double).
 *   - Offering a double (to 2X) is handled client-side as a dialog; the server
 *     only handles the resolution: acceptDouble or declineDouble.
 *   - acceptDouble: cube flips to 2X and ownership transfers to the accepting player.
 *     Only the accepting player may initiate the next double.
 *   - declineDouble: the offering player wins the current game at the PRE-DOUBLE
 *     cube value (a concession). Points awarded = currentCubeValue × 1 (normal).
 *     If this ends the match, winner stats are updated atomically.
 *   - After each game records, cube resets to center (value=1, owner=null).
 *
 * Standings:
 *   Cached on TournamentMember.wins / losses / points.
 *   Updated atomically ($transaction) on match completion.
 *   Winner earns tournament.pointsPerWin tournament points.
 */

import { revalidatePath }     from 'next/cache'
import { redirect }           from 'next/navigation'
import { db }                 from '@/lib/db'
import { requireSessionUser } from '@/lib/session'
import {
  createMatchSchema,
  recordMatchGameSchema,
  acceptDoubleSchema,
  declineDoubleSchema,
  completeMatchSchema,
  setScoreSchema,
  generateScheduleSchema,
} from '@/validations'
import { generateRoundRobin }        from '@/lib/tournament/round-robin'
import { generateSingleElimination } from '@/lib/tournament/single-elimination'
import {
  GAME_TYPE_MULTIPLIER,
} from '@/types'
import type {
  ActionResult,
  Match,
  MatchSummary,
  MatchGame,
  StandingsRow,
  GameType,
  MatchStatus,
  OpeningType,
} from '@/types'

// ─────────────────────────────────────────────────────────────────────────────
// SHAPE HELPERS
// ─────────────────────────────────────────────────────────────────────────────

type PrismaMatchGame = {
  id: string; matchId: string; gameNumber: number
  winnerId: string; loserId: string; cubeValue: number
  gameType: string; pointsAwarded: number; createdAt: Date
  winner: { id: string; guestName: string | null; player: { name: string } | null }
  loser:  { id: string; guestName: string | null; player: { name: string } | null }
}

function resolveName(m: { guestName: string | null; player?: { name: string } | null } | null) {
  if (!m) return 'TBD'   // bracket slot not yet decided
  return m.player?.name ?? m.guestName ?? 'Unknown'
}

function shapeMatchGame(g: PrismaMatchGame): MatchGame {
  return {
    id:            g.id,
    matchId:       g.matchId,
    gameNumber:    g.gameNumber,
    winnerId:      g.winnerId,
    loserId:       g.loserId,
    cubeValue:     g.cubeValue,
    gameType:      g.gameType as GameType,
    pointsAwarded: g.pointsAwarded,
    createdAt:     g.createdAt,
    winnerName:    resolveName(g.winner),
    loserName:     resolveName(g.loser),
  }
}

const memberSelect = {
  id:       true,
  guestName: true,
  player: { select: { name: true } },
} as const

const matchInclude = {
  player1:   { select: memberSelect },
  player2:   { select: memberSelect },
  winner:    { select: memberSelect },
  games: {
    include: {
      winner: { select: memberSelect },
      loser:  { select: memberSelect },
    },
    orderBy: { gameNumber: 'asc' as const },
  },
} as const

// ─────────────────────────────────────────────────────────────────────────────
// QUERIES
// ─────────────────────────────────────────────────────────────────────────────

export async function getMatch(matchId: string): Promise<Match> {
  await requireSessionUser()

  const m = await db.match.findUniqueOrThrow({
    where:   { id: matchId },
    include: matchInclude,
  })

  return {
    id:           m.id,
    tournamentId: m.tournamentId,
    player1Id:    m.player1Id,
    player2Id:    m.player2Id,
    player1Name:  resolveName(m.player1),
    player2Name:  resolveName(m.player2),
    winnerName:   m.winner ? resolveName(m.winner) : null,
    targetScore:  m.targetScore,
    player1Score: m.player1Score,
    player2Score: m.player2Score,
    cubeValue:    m.cubeValue,
    cubeOwnerId:  m.cubeOwnerId,
    status:       m.status as MatchStatus,
    winnerId:     m.winnerId,
    round:        m.round,
    bracket:      m.bracket,
    openingType:  m.openingType as OpeningType | null,
    notes:        m.notes,
    startedAt:    m.startedAt,
    completedAt:  m.completedAt,
    duration:     m.duration,
    recordedById: m.recordedById,
    createdAt:    m.createdAt,
    updatedAt:    m.updatedAt,
    games:        m.games.map(shapeMatchGame),
  }
}

export async function getTournamentMatches(tournamentId: string): Promise<MatchSummary[]> {
  await requireSessionUser()

  const matches = await db.match.findMany({
    where:   { tournamentId },
    orderBy: { createdAt: 'desc' },
    include: {
      player1:   { select: memberSelect },
      player2:   { select: memberSelect },
      winner:    { select: memberSelect },
      _count: { select: { games: true } },
    },
  })

  return matches.map(m => ({
    id:           m.id,
    tournamentId: m.tournamentId,
    player1Id:    m.player1Id,
    player2Id:    m.player2Id,
    player1Name:  resolveName(m.player1),
    player2Name:  resolveName(m.player2),
    winnerName:   m.winner ? resolveName(m.winner) : null,
    targetScore:  m.targetScore,
    player1Score: m.player1Score,
    player2Score: m.player2Score,
    cubeValue:    m.cubeValue,
    cubeOwnerId:  m.cubeOwnerId,
    status:       m.status as MatchStatus,
    winnerId:     m.winnerId,
    round:        m.round,
    bracket:      m.bracket,
    openingType:  m.openingType as OpeningType | null,
    notes:        m.notes,
    startedAt:    m.startedAt,
    completedAt:  m.completedAt,
    duration:     m.duration,
    recordedById: m.recordedById,
    createdAt:    m.createdAt,
    updatedAt:    m.updatedAt,
    gameCount:    m._count.games,
  }))
}

export async function getStandings(tournamentId: string): Promise<StandingsRow[]> {
  await requireSessionUser()

  const members = await db.tournamentMember.findMany({
    where:   { tournamentId },
    include: { player: { select: { name: true } } },
    orderBy: [
      { points: 'desc' },
      { wins:   'desc' },
      { losses: 'asc'  },
    ],
  })

  return members.map((m, i) => {
    const totalGames = m.wins + m.losses
    return {
      rank:       i + 1,
      memberId:   m.id,
      name:       m.player?.name ?? m.guestName ?? 'Unknown',
      isGuest:    m.playerId === null,
      wins:       m.wins,
      losses:     m.losses,
      points:     m.points,
      winRate:    totalGames > 0 ? Math.round((m.wins / totalGames) * 100) : 0,
      matchDiff:  m.wins - m.losses,
      totalGames,
    }
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// MUTATIONS
// ─────────────────────────────────────────────────────────────────────────────

export async function createMatch(
  data: unknown,
): Promise<ActionResult<{ id: string; scheduled: boolean }>> {
  const user = await requireSessionUser()

  const parsed = createMatchSchema.safeParse(data)
  if (!parsed.success) return { success: false, error: parsed.error.errors[0].message }

  const { tournamentId, player1Id, player2Id, targetScore, scheduledAt } = parsed.data

  // Verify both members belong to this tournament
  const [m1, m2] = await Promise.all([
    db.tournamentMember.findUnique({ where: { id: player1Id }, select: { tournamentId: true } }),
    db.tournamentMember.findUnique({ where: { id: player2Id }, select: { tournamentId: true } }),
  ])
  if (!m1 || m1.tournamentId !== tournamentId) return { success: false, error: 'Player 1 is not in this tournament.' }
  if (!m2 || m2.tournamentId !== tournamentId) return { success: false, error: 'Player 2 is not in this tournament.' }

  // Check for already-active/scheduled match between these two
  const existing = await db.match.findFirst({
    where: {
      tournamentId,
      status: { in: ['PENDING', 'ACTIVE'] },
      OR: [
        { player1Id, player2Id },
        { player1Id: player2Id, player2Id: player1Id },
      ],
    },
  })
  if (existing) return { success: false, error: 'These players already have an active or scheduled match.' }

  const isScheduled = !!scheduledAt
  const match = await db.match.create({
    data: {
      tournamentId,
      player1Id,
      player2Id,
      targetScore,
      status:       isScheduled ? 'PENDING' : 'ACTIVE',
      scheduledAt:  scheduledAt ? new Date(scheduledAt) : null,
      startedAt:    isScheduled ? null : new Date(),
      recordedById: user.id,
    },
    select: { id: true },
  })

  revalidatePath(`/tournaments/${tournamentId}/matches`)
  revalidatePath('/schedule')
  return { success: true, data: { id: match.id, scheduled: isScheduled } }
}

// ─────────────────────────────────────────────────────────────────────────────
// AUTO-SCHEDULE — ROUND ROBIN
// Generates the full round-robin schedule for a tournament: every player meets
// every other player once. Players are seeded by current standings (points,
// then wins, then name) so top seeds are spread across the rounds.
// ─────────────────────────────────────────────────────────────────────────────

export async function generateRoundRobinSchedule(
  data: unknown,
): Promise<ActionResult<{ created: number; rounds: number }>> {
  const user = await requireSessionUser()

  const parsed = generateScheduleSchema.safeParse(data)
  if (!parsed.success) return { success: false, error: parsed.error.errors[0].message }

  const { tournamentId, replace } = parsed.data

  const tournament = await db.tournament.findUnique({
    where:  { id: tournamentId, deletedAt: null },
    select: { createdById: true, status: true, format: true, matchLength: true },
  })
  if (!tournament) return { success: false, error: 'Tournament not found.' }

  // Permission: organizer, creator, or admin.
  const isOrganizer = await db.tournamentMember.findFirst({
    where: { tournamentId, playerId: user.id, memberRole: 'ORGANIZER' },
  })
  if (!isOrganizer && tournament.createdById !== user.id && user.role !== 'ADMIN') {
    return { success: false, error: 'You do not have permission to schedule this tournament.' }
  }

  if (tournament.format !== 'ROUND_ROBIN') {
    return { success: false, error: 'Auto-scheduling is currently available for Round Robin tournaments only.' }
  }
  if (tournament.status === 'COMPLETED' || tournament.status === 'ARCHIVED') {
    return { success: false, error: 'This tournament has already ended.' }
  }

  // Existing matches guard.
  const existing = await db.match.findMany({
    where:  { tournamentId },
    select: { id: true, status: true },
  })
  if (existing.length > 0 && !replace) {
    return { success: false, error: 'This tournament already has matches. Use "Regenerate" to replace the upcoming ones.' }
  }
  // When replacing, only clear matches that haven't started — never touch
  // active/completed ones (those affect standings).
  if (replace) {
    const removable = existing.filter(m => m.status === 'PENDING').map(m => m.id)
    if (existing.some(m => m.status !== 'PENDING')) {
      return { success: false, error: 'Some matches have already started or finished. Can only regenerate before any match begins.' }
    }
    if (removable.length > 0) {
      await db.match.deleteMany({ where: { id: { in: removable } } })
    }
  }

  // Seed members by performance: points desc, wins desc, then name for stability.
  const members = await db.tournamentMember.findMany({
    where:   { tournamentId },
    select:  { id: true, points: true, wins: true, guestName: true, player: { select: { name: true } } },
  })
  if (members.length < 2) {
    return { success: false, error: 'Add at least 2 players before generating a schedule.' }
  }

  const seeded = members
    .sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points
      if (b.wins   !== a.wins)   return b.wins   - a.wins
      return (a.player?.name ?? a.guestName ?? '').localeCompare(b.player?.name ?? b.guestName ?? '')
    })
    .map(m => m.id)

  const pairs       = generateRoundRobin(seeded)
  const targetScore = tournament.matchLength ?? 1

  await db.match.createMany({
    data: pairs.map(p => ({
      tournamentId,
      player1Id:    p.player1Id,
      player2Id:    p.player2Id,
      round:        p.round,
      targetScore,
      status:       'PENDING' as const,
      recordedById: user.id,
    })),
  })

  const rounds = pairs.reduce((max, p) => Math.max(max, p.round), 0)

  revalidatePath(`/tournaments/${tournamentId}`)
  revalidatePath(`/tournaments/${tournamentId}/matches`)
  revalidatePath('/schedule')
  return { success: true, data: { created: pairs.length, rounds } }
}

// ─────────────────────────────────────────────────────────────────────────────
// AUTO-SCHEDULE — SINGLE ELIMINATION BRACKET
// Builds a seeded knockout bracket: players are seeded by current standings,
// the bracket is padded to a power of two (top seeds get byes), and matches are
// linked so that winners advance automatically (see advanceBracketWinner).
// Future matchups exist as rows with TBD (null) players until a winner arrives.
// ─────────────────────────────────────────────────────────────────────────────

export async function generateEliminationBracket(
  data: unknown,
): Promise<ActionResult<{ created: number; rounds: number; byes: number }>> {
  const user = await requireSessionUser()

  const parsed = generateScheduleSchema.safeParse(data)
  if (!parsed.success) return { success: false, error: parsed.error.errors[0].message }

  const { tournamentId, replace } = parsed.data

  const tournament = await db.tournament.findUnique({
    where:  { id: tournamentId, deletedAt: null },
    select: { createdById: true, status: true, format: true, matchLength: true },
  })
  if (!tournament) return { success: false, error: 'Tournament not found.' }

  const isOrganizer = await db.tournamentMember.findFirst({
    where: { tournamentId, playerId: user.id, memberRole: 'ORGANIZER' },
  })
  if (!isOrganizer && tournament.createdById !== user.id && user.role !== 'ADMIN') {
    return { success: false, error: 'You do not have permission to schedule this tournament.' }
  }

  if (tournament.format !== 'SINGLE_ELIMINATION') {
    return { success: false, error: 'Bracket generation is currently available for Single Elimination tournaments only.' }
  }
  if (tournament.status === 'COMPLETED' || tournament.status === 'ARCHIVED') {
    return { success: false, error: 'This tournament has already ended.' }
  }

  // Existing-matches guard (same policy as round robin).
  const existing = await db.match.findMany({
    where:  { tournamentId },
    select: { id: true, status: true },
  })
  if (existing.length > 0 && !replace) {
    return { success: false, error: 'This tournament already has matches. Use "Regenerate" to rebuild the bracket.' }
  }
  if (replace) {
    if (existing.some(m => m.status !== 'PENDING')) {
      return { success: false, error: 'Some matches have already started or finished. Can only rebuild the bracket before any match begins.' }
    }
    if (existing.length > 0) {
      // Clear winner links first to avoid FK restrictions, then delete.
      await db.match.updateMany({ where: { tournamentId }, data: { nextMatchId: null } })
      await db.match.deleteMany({ where: { tournamentId } })
    }
  }

  // Seed members by performance: points desc, wins desc, then name.
  const members = await db.tournamentMember.findMany({
    where:  { tournamentId },
    select: { id: true, points: true, wins: true, guestName: true, player: { select: { name: true } } },
  })
  if (members.length < 2) {
    return { success: false, error: 'Add at least 2 players before generating a bracket.' }
  }

  const seeded = members
    .sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points
      if (b.wins   !== a.wins)   return b.wins   - a.wins
      return (a.player?.name ?? a.guestName ?? '').localeCompare(b.player?.name ?? b.guestName ?? '')
    })
    .map(m => m.id)

  const { matches: specs, rounds, byes } = generateSingleElimination(seeded)
  const targetScore = tournament.matchLength ?? 1

  // Create rows (without links yet), capturing spec.key → real id.
  const keyToId = new Map<string, string>()
  await db.$transaction(async tx => {
    for (const spec of specs) {
      const created = await tx.match.create({
        data: {
          tournamentId,
          player1Id:    spec.player1Id,
          player2Id:    spec.player2Id,
          targetScore,
          status:       'PENDING',
          round:        spec.round,
          bracket:      'WINNERS',
          bracketSlot:  spec.slot,
          recordedById: user.id,
        },
        select: { id: true },
      })
      keyToId.set(spec.key, created.id)
    }
    // Second pass: wire winner-advancement links.
    for (const spec of specs) {
      if (!spec.nextKey) continue
      await tx.match.update({
        where: { id: keyToId.get(spec.key)! },
        data:  {
          nextMatchId:   keyToId.get(spec.nextKey)!,
          nextMatchSlot: spec.nextSlot,
        },
      })
    }
  })

  revalidatePath(`/tournaments/${tournamentId}`)
  revalidatePath(`/tournaments/${tournamentId}/matches`)
  revalidatePath('/schedule')
  return { success: true, data: { created: specs.length, rounds, byes } }
}

/**
 * Advance the winner of a just-completed bracket match into its next match.
 * No-op for non-bracket matches or the final (no nextMatch). Idempotent enough
 * for our flow: it only writes the winner into the designated empty slot.
 */
async function advanceBracketWinner(matchId: string): Promise<void> {
  const m = await db.match.findUnique({
    where:  { id: matchId },
    select: { status: true, winnerId: true, nextMatchId: true, nextMatchSlot: true, tournamentId: true },
  })
  if (!m || m.status !== 'COMPLETED' || !m.winnerId || !m.nextMatchId || !m.nextMatchSlot) return

  await db.match.update({
    where: { id: m.nextMatchId },
    data:  m.nextMatchSlot === 1 ? { player1Id: m.winnerId } : { player2Id: m.winnerId },
  })

  revalidatePath(`/tournaments/${m.tournamentId}/matches`)
}

// ─────────────────────────────────────────────────────────────────────────────
// RECORD A GAME WITHIN THE MATCH
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Records a completed game within an active match.
 *
 * Process:
 *  1. Determine points = cubeValue × gameTypeMultiplier
 *  2. Increment winner's match score
 *  3. If winner's score >= targetScore → complete the match atomically
 *  4. Otherwise → persist new scores, reset cube to center
 *
 * Returns: { matchComplete, winnerId? } so the client can react.
 */
export async function recordGameInMatch(
  data: unknown,
): Promise<ActionResult<{ matchComplete: boolean; winnerId?: string | null }>> {
  await requireSessionUser()

  const parsed = recordMatchGameSchema.safeParse(data)
  if (!parsed.success) return { success: false, error: parsed.error.errors[0].message }

  const { matchId, winnerId, gameType } = parsed.data

  const match = await db.match.findUnique({
    where: { id: matchId },
    include: { tournament: { select: { pointsPerWin: true, id: true } } },
  })
  if (!match)              return { success: false, error: 'Match not found.' }
  if (match.status !== 'ACTIVE') return { success: false, error: 'Match is not active.' }
  if (!match.player1Id || !match.player2Id) {
    return { success: false, error: 'This match is still waiting for both players.' }
  }

  if (winnerId !== match.player1Id && winnerId !== match.player2Id) {
    return { success: false, error: 'Winner must be one of the two players.' }
  }

  const loserId = winnerId === match.player1Id ? match.player2Id : match.player1Id

  const multiplier    = GAME_TYPE_MULTIPLIER[gameType as GameType]
  const pointsAwarded = match.cubeValue * multiplier
  const gameNumber    = await db.matchGame.count({ where: { matchId } }) + 1

  const isP1Win       = winnerId === match.player1Id
  const newP1Score    = match.player1Score + (isP1Win ? pointsAwarded : 0)
  const newP2Score    = match.player2Score + (isP1Win ? 0 : pointsAwarded)
  const matchComplete = newP1Score >= match.targetScore || newP2Score >= match.targetScore
  const matchWinnerId = matchComplete ? winnerId : null
  const matchLoserId  = matchComplete ? loserId  : null

  if (matchComplete) {
    // Atomic: create game + finish match + update member stats
    await db.$transaction([
      db.matchGame.create({
        data: {
          matchId, gameNumber, winnerId, loserId,
          cubeValue: match.cubeValue,
          gameType:  gameType as import('@prisma/client').GameType,
          pointsAwarded,
        },
      }),
      db.match.update({
        where: { id: matchId },
        data:  {
          player1Score: newP1Score,
          player2Score: newP2Score,
          status:       'COMPLETED',
          winnerId:     matchWinnerId,
          completedAt:  new Date(),
          duration:     match.startedAt
            ? Math.round((Date.now() - match.startedAt.getTime()) / 1000)
            : null,
          // Reset cube (for record)
          cubeValue:   1,
          cubeOwnerId: null,
        },
      }),
      db.tournamentMember.update({
        where: { id: matchWinnerId! },
        data:  {
          wins:   { increment: 1 },
          points: { increment: match.tournament.pointsPerWin },
        },
      }),
      db.tournamentMember.update({
        where: { id: matchLoserId! },
        data:  { losses: { increment: 1 } },
      }),
    ])
  } else {
    // Atomic: create game + update match scores + reset cube to center
    await db.$transaction([
      db.matchGame.create({
        data: {
          matchId, gameNumber, winnerId, loserId,
          cubeValue: match.cubeValue,
          gameType:  gameType as import('@prisma/client').GameType,
          pointsAwarded,
        },
      }),
      db.match.update({
        where: { id: matchId },
        data:  {
          player1Score: newP1Score,
          player2Score: newP2Score,
          cubeValue:    1,       // cube resets to center after each game
          cubeOwnerId:  null,
        },
      }),
    ])
  }

  revalidatePath(`/tournaments/${match.tournament.id}/matches/${matchId}`)
  revalidatePath(`/tournaments/${match.tournament.id}/standings`)
  if (matchComplete) {
    revalidatePath(`/tournaments/${match.tournament.id}/matches`)
    await advanceBracketWinner(matchId)   // bracket: push winner into next match (no-op otherwise)
  }

  return { success: true, data: { matchComplete, winnerId: matchWinnerId } }
}

// ─────────────────────────────────────────────────────────────────────────────
// DOUBLING CUBE — ACCEPT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Accepts a double: cube flips to 2× current value, ownership transfers
 * to the accepting player. Only they may initiate the next double.
 */
export async function acceptDouble(
  data: unknown,
): Promise<ActionResult<{ newCubeValue: number }>> {
  await requireSessionUser()

  const parsed = acceptDoubleSchema.safeParse(data)
  if (!parsed.success) return { success: false, error: parsed.error.errors[0].message }

  const { matchId, acceptorId } = parsed.data

  const match = await db.match.findUnique({ where: { id: matchId } })
  if (!match)              return { success: false, error: 'Match not found.' }
  if (match.status !== 'ACTIVE') return { success: false, error: 'Match is not active.' }

  const newValue = match.cubeValue * 2
  if (newValue > 64) return { success: false, error: 'Cube is already at maximum (64).' }

  if (acceptorId !== match.player1Id && acceptorId !== match.player2Id) {
    return { success: false, error: 'Invalid player.' }
  }

  await db.match.update({
    where: { id: matchId },
    data:  { cubeValue: newValue, cubeOwnerId: acceptorId },
  })

  revalidatePath(`/tournaments/${match.tournamentId}/matches/${matchId}`)
  return { success: true, data: { newCubeValue: newValue } }
}

// ─────────────────────────────────────────────────────────────────────────────
// DOUBLING CUBE — DECLINE (concede the game at current stakes)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Declines a double.
 *
 * The player who offered the double wins THIS GAME at the CURRENT cube value
 * (before the proposed double). This is equivalent to recording a normal game
 * won by the offerer. If it completes the match, member stats update atomically.
 */
export async function declineDouble(
  data: unknown,
): Promise<ActionResult<{ matchComplete: boolean; winnerId?: string | null }>> {
  await requireSessionUser()

  const parsed = declineDoubleSchema.safeParse(data)
  if (!parsed.success) return { success: false, error: parsed.error.errors[0].message }

  const { matchId, offererId } = parsed.data

  const match = await db.match.findUnique({
    where:   { id: matchId },
    include: { tournament: { select: { pointsPerWin: true } } },
  })
  if (!match)              return { success: false, error: 'Match not found.' }
  if (match.status !== 'ACTIVE') return { success: false, error: 'Match is not active.' }
  if (!match.player1Id || !match.player2Id) {
    return { success: false, error: 'This match is still waiting for both players.' }
  }

  if (offererId !== match.player1Id && offererId !== match.player2Id) {
    return { success: false, error: 'Invalid player.' }
  }

  // Winner = the player who offered the double
  const winnerId    = offererId
  const loserId     = offererId === match.player1Id ? match.player2Id : match.player1Id
  const pointsAwarded = match.cubeValue    // NORMAL × current value (no multiplier for a concession)
  const gameNumber  = await db.matchGame.count({ where: { matchId } }) + 1

  const isP1Win    = winnerId === match.player1Id
  const newP1Score = match.player1Score + (isP1Win ? pointsAwarded : 0)
  const newP2Score = match.player2Score + (isP1Win ? 0 : pointsAwarded)
  const matchComplete = newP1Score >= match.targetScore || newP2Score >= match.targetScore
  const matchWinnerId = matchComplete ? winnerId : null
  const matchLoserId  = matchComplete ? loserId  : null

  if (matchComplete) {
    await db.$transaction([
      db.matchGame.create({
        data: {
          matchId, gameNumber, winnerId, loserId,
          cubeValue: match.cubeValue,
          gameType:  'NORMAL',
          pointsAwarded,
        },
      }),
      db.match.update({
        where: { id: matchId },
        data:  {
          player1Score: newP1Score,
          player2Score: newP2Score,
          status:       'COMPLETED',
          winnerId:     matchWinnerId,
          completedAt:  new Date(),
          duration:     match.startedAt
            ? Math.round((Date.now() - match.startedAt.getTime()) / 1000)
            : null,
          cubeValue:   1,
          cubeOwnerId: null,
        },
      }),
      db.tournamentMember.update({
        where: { id: matchWinnerId! },
        data:  { wins: { increment: 1 }, points: { increment: match.tournament.pointsPerWin } },
      }),
      db.tournamentMember.update({
        where: { id: matchLoserId! },
        data:  { losses: { increment: 1 } },
      }),
    ])
  } else {
    await db.$transaction([
      db.matchGame.create({
        data: {
          matchId, gameNumber, winnerId, loserId,
          cubeValue: match.cubeValue,
          gameType:  'NORMAL',
          pointsAwarded,
        },
      }),
      db.match.update({
        where: { id: matchId },
        data:  {
          player1Score: newP1Score,
          player2Score: newP2Score,
          cubeValue:    1,
          cubeOwnerId:  null,
        },
      }),
    ])
  }

  revalidatePath(`/tournaments/${match.tournamentId}/matches/${matchId}`)
  if (matchComplete) {
    revalidatePath(`/tournaments/${match.tournamentId}/matches`)
    await advanceBracketWinner(matchId)   // bracket: push winner into next match (no-op otherwise)
  }
  revalidatePath(`/tournaments/${match.tournamentId}/standings`)
  return { success: true, data: { matchComplete, winnerId: matchWinnerId } }
}

// ─────────────────────────────────────────────────────────────────────────────
// UNDO LAST GAME
// ─────────────────────────────────────────────────────────────────────────────

export async function undoLastGame(
  matchId: string,
): Promise<ActionResult> {
  await requireSessionUser()

  const match = await db.match.findUnique({ where: { id: matchId } })
  if (!match) return { success: false, error: 'Match not found.' }
  if (match.status === 'COMPLETED') return { success: false, error: 'Cannot undo a completed match.' }

  const lastGame = await db.matchGame.findFirst({
    where:   { matchId },
    orderBy: { gameNumber: 'desc' },
  })
  if (!lastGame) return { success: false, error: 'No games to undo.' }

  // Reverse the score update
  const isP1Winner  = lastGame.winnerId === match.player1Id
  const newP1Score  = match.player1Score - (isP1Winner ? lastGame.pointsAwarded : 0)
  const newP2Score  = match.player2Score - (isP1Winner ? 0 : lastGame.pointsAwarded)

  await db.$transaction([
    db.matchGame.delete({ where: { id: lastGame.id } }),
    db.match.update({
      where: { id: matchId },
      data:  {
        player1Score: Math.max(0, newP1Score),
        player2Score: Math.max(0, newP2Score),
        cubeValue:    1,
        cubeOwnerId:  null,
      },
    }),
  ])

  revalidatePath(`/tournaments/${match.tournamentId}/matches/${matchId}`)
  return { success: true, data: undefined }
}

// ─────────────────────────────────────────────────────────────────────────────
// FINALIZE MATCH (add opening type / notes to completed match)
// ─────────────────────────────────────────────────────────────────────────────

export async function finalizeMatch(
  data: unknown,
): Promise<ActionResult> {
  await requireSessionUser()

  const parsed = completeMatchSchema.safeParse(data)
  if (!parsed.success) return { success: false, error: parsed.error.errors[0].message }

  const { matchId, openingType, notes } = parsed.data

  const match = await db.match.findUnique({ where: { id: matchId } })
  if (!match) return { success: false, error: 'Match not found.' }

  await db.match.update({
    where: { id: matchId },
    data:  {
      openingType: openingType as import('@prisma/client').OpeningType | undefined,
      notes:       notes ?? match.notes,
    },
  })

  revalidatePath(`/tournaments/${match.tournamentId}/matches/${matchId}`)
  return { success: true, data: undefined }
}

// ─────────────────────────────────────────────────────────────────────────────
// MANUAL SCORE CORRECTION (organizer override)
// ─────────────────────────────────────────────────────────────────────────────

export async function setMatchScore(
  data: unknown,
): Promise<ActionResult> {
  const user = await requireSessionUser()
  if (user.role !== 'ADMIN' && user.role !== 'TOURNAMENT_MANAGER') {
    return { success: false, error: 'Only admins or tournament managers can override scores.' }
  }

  const parsed = setScoreSchema.safeParse(data)
  if (!parsed.success) return { success: false, error: parsed.error.errors[0].message }

  const { matchId, player1Score, player2Score } = parsed.data

  const match = await db.match.findUnique({ where: { id: matchId } })
  if (!match) return { success: false, error: 'Match not found.' }

  await db.match.update({
    where: { id: matchId },
    data:  { player1Score, player2Score },
  })

  revalidatePath(`/tournaments/${match.tournamentId}/matches/${matchId}`)
  return { success: true, data: undefined }
}

// ─────────────────────────────────────────────────────────────────────────────
// SCHEDULED MATCH HELPERS
// ─────────────────────────────────────────────────────────────────────────────

export interface UpcomingMatch {
  id:            string
  tournamentId:  string
  tournamentName: string
  player1Name:   string
  player2Name:   string
  targetScore:   number
  scheduledAt:   Date | null
  createdAt:     Date
}

/** All PENDING matches (across all tournaments the current user is in). */
export async function getUpcomingMatches(): Promise<UpcomingMatch[]> {
  const user = await requireSessionUser()

  // Find tournament IDs the user belongs to
  const memberships = await db.tournamentMember.findMany({
    where: { playerId: user.id },
    select: { tournamentId: true },
  })
  const tournamentIds = memberships.map(m => m.tournamentId)

  const matches = await db.match.findMany({
    where: {
      tournamentId: { in: tournamentIds },
      status: 'PENDING',
      // Skip bracket slots still awaiting a player — they aren't startable yet.
      player1Id: { not: null },
      player2Id: { not: null },
    },
    include: {
      tournament: { select: { name: true } },
      player1:    { select: { player: { select: { name: true } }, guestName: true } },
      player2:    { select: { player: { select: { name: true } }, guestName: true } },
    },
    orderBy: [
      { scheduledAt: { sort: 'asc', nulls: 'last' } },
      { createdAt: 'asc' },
    ],
  })

  return matches.map(m => ({
    id:             m.id,
    tournamentId:   m.tournamentId,
    tournamentName: m.tournament.name,
    player1Name:    m.player1?.player?.name ?? m.player1?.guestName ?? 'Unknown',
    player2Name:    m.player2?.player?.name ?? m.player2?.guestName ?? 'Unknown',
    targetScore:    m.targetScore,
    scheduledAt:    m.scheduledAt,
    createdAt:      m.createdAt,
  }))
}

// ─────────────────────────────────────────────────────────────────────────────
// SUGGESTED MATCHES
// Recommends a set of balanced, fresh matchups among a tournament's players.
// Heuristic (higher score = better suggestion):
//   • Freshness  — strongly prefer pairs who have never played a completed match.
//   • Balance    — prefer players close in points and win rate (competitive games).
// Players currently in a live match, and pairs that already have a pending/active
// match, are excluded. Picks are greedy and non-overlapping, so the result reads
// like a suggested "next round" the organizer can create in one go.
// ─────────────────────────────────────────────────────────────────────────────

export interface SuggestedMatch {
  player1Id:   string
  player1Name: string
  player2Id:   string
  player2Name: string
  reason:      string
}

export async function getSuggestedMatches(tournamentId: string): Promise<SuggestedMatch[]> {
  await requireSessionUser()

  const [memberRows, matchRows] = await Promise.all([
    db.tournamentMember.findMany({
      where:  { tournamentId },
      select: { id: true, points: true, wins: true, losses: true, guestName: true, player: { select: { name: true } } },
    }),
    db.match.findMany({
      where:  { tournamentId },
      select: { player1Id: true, player2Id: true, status: true },
    }),
  ])

  if (memberRows.length < 2) return []

  const pairKey = (a: string, b: string) => [a, b].sort().join('|')

  const playedPairs    = new Set<string>()   // completed head-to-heads
  const scheduledPairs = new Set<string>()    // already have a pending/active match
  const busy           = new Set<string>()    // currently in a live match
  for (const m of matchRows) {
    if (!m.player1Id || !m.player2Id) continue
    const key = pairKey(m.player1Id, m.player2Id)
    if (m.status === 'COMPLETED') playedPairs.add(key)
    if (m.status === 'PENDING' || m.status === 'ACTIVE') scheduledPairs.add(key)
    if (m.status === 'ACTIVE') { busy.add(m.player1Id); busy.add(m.player2Id) }
  }

  const available = memberRows
    .filter(m => !busy.has(m.id))
    .map(m => ({
      id:      m.id,
      name:    resolveName(m),
      points:  m.points,
      winRate: m.wins + m.losses > 0 ? m.wins / (m.wins + m.losses) : 0.5,
    }))

  if (available.length < 2) return []

  // Score every eligible pair.
  type Cand = { a: typeof available[number]; b: typeof available[number]; score: number; pointDiff: number; played: boolean }
  const cands: Cand[] = []
  for (let i = 0; i < available.length; i++) {
    for (let j = i + 1; j < available.length; j++) {
      const a = available[i], b = available[j]
      const key = pairKey(a.id, b.id)
      if (scheduledPairs.has(key)) continue   // don't double-book an existing match
      const played    = playedPairs.has(key)
      const pointDiff = Math.abs(a.points - b.points)
      const wrDiff    = Math.abs(a.winRate - b.winRate)
      const score     = (played ? 0 : 100) - pointDiff * 2 - wrDiff * 20
      cands.push({ a, b, score, pointDiff, played })
    }
  }

  cands.sort((x, y) => (y.score - x.score) || (x.pointDiff - y.pointDiff))

  // Greedy non-overlapping selection.
  const used = new Set<string>()
  const cap  = Math.min(Math.floor(available.length / 2), 6)
  const out: SuggestedMatch[] = []
  for (const c of cands) {
    if (out.length >= cap) break
    if (used.has(c.a.id) || used.has(c.b.id)) continue
    used.add(c.a.id); used.add(c.b.id)

    const parts = [c.played ? 'Rematch' : 'First meeting']
    if (c.pointDiff === 0)      parts.push('level on points')
    else if (c.pointDiff <= 2)  parts.push('close in standings')

    out.push({
      player1Id: c.a.id, player1Name: c.a.name,
      player2Id: c.b.id, player2Name: c.b.name,
      reason:    parts.join(' · '),
    })
  }

  return out
}

/** Start a scheduled (PENDING) match immediately. */
export async function startScheduledMatch(matchId: string): Promise<ActionResult> {
  const user = await requireSessionUser()

  const match = await db.match.findUnique({
    where: { id: matchId },
    select: { status: true, tournamentId: true, player1Id: true, player2Id: true },
  })
  if (!match) return { success: false, error: 'Match not found.' }
  if (match.status !== 'PENDING') return { success: false, error: 'Match is not pending.' }
  if (!match.player1Id || !match.player2Id) {
    return { success: false, error: 'This match is waiting for both players to be decided.' }
  }

  // Must be a member of the tournament
  const membership = await db.tournamentMember.findFirst({
    where: { tournamentId: match.tournamentId, playerId: user.id },
  })
  if (!membership && user.role !== 'ADMIN') {
    return { success: false, error: 'You are not a member of this tournament.' }
  }

  await db.match.update({
    where: { id: matchId },
    data:  { status: 'ACTIVE', startedAt: new Date() },
  })

  revalidatePath(`/tournaments/${match.tournamentId}/matches`)
  revalidatePath('/schedule')
  return { success: true, data: undefined }
}

/** Cancel (delete) a scheduled (PENDING) match. */
export async function cancelScheduledMatch(matchId: string): Promise<ActionResult> {
  const user = await requireSessionUser()

  const match = await db.match.findUnique({
    where: { id: matchId },
    select: { status: true, tournamentId: true, recordedById: true },
  })
  if (!match) return { success: false, error: 'Match not found.' }
  if (match.status !== 'PENDING') return { success: false, error: 'Only pending matches can be cancelled.' }

  if (match.recordedById !== user.id && user.role !== 'ADMIN') {
    return { success: false, error: 'Only the creator or an admin can cancel this match.' }
  }

  await db.match.delete({ where: { id: matchId } })

  revalidatePath(`/tournaments/${match.tournamentId}/matches`)
  revalidatePath('/schedule')
  return { success: true, data: undefined }
}

// ─────────────────────────────────────────────────────────────────────────────
// ABANDON ACTIVE MATCH
// Voids an in-progress match — no winner recorded, standings unchanged.
// Only the match creator or an ADMIN can abandon.
// ─────────────────────────────────────────────────────────────────────────────

export async function abandonMatch(matchId: string): Promise<ActionResult> {
  const user = await requireSessionUser()

  const match = await db.match.findUnique({
    where:  { id: matchId },
    select: { status: true, tournamentId: true, recordedById: true },
  })
  if (!match) return { success: false, error: 'Match not found.' }
  if (match.status === 'COMPLETED') {
    return { success: false, error: 'Completed matches cannot be abandoned.' }
  }

  if (match.recordedById !== user.id && user.role !== 'ADMIN') {
    return { success: false, error: 'Only the match creator or an admin can abandon this match.' }
  }

  // Delete the match (cascades match games)
  await db.match.delete({ where: { id: matchId } })

  revalidatePath(`/tournaments/${match.tournamentId}/matches`)
  revalidatePath(`/tournaments/${match.tournamentId}`)
  revalidatePath('/schedule')
  return { success: true, data: undefined }
}
