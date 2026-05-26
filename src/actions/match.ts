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
} from '@/validations'
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

function resolveName(m: { guestName: string | null; player?: { name: string } | null }) {
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
): Promise<ActionResult<{ id: string }>> {
  const user = await requireSessionUser()

  const parsed = createMatchSchema.safeParse(data)
  if (!parsed.success) return { success: false, error: parsed.error.errors[0].message }

  const { tournamentId, player1Id, player2Id, targetScore } = parsed.data

  // Verify both members belong to this tournament
  const [m1, m2] = await Promise.all([
    db.tournamentMember.findUnique({ where: { id: player1Id }, select: { tournamentId: true } }),
    db.tournamentMember.findUnique({ where: { id: player2Id }, select: { tournamentId: true } }),
  ])
  if (!m1 || m1.tournamentId !== tournamentId) return { success: false, error: 'Player 1 is not in this tournament.' }
  if (!m2 || m2.tournamentId !== tournamentId) return { success: false, error: 'Player 2 is not in this tournament.' }

  // Check for already-active match between these two
  const active = await db.match.findFirst({
    where: {
      tournamentId,
      status: { in: ['PENDING', 'ACTIVE'] },
      OR: [
        { player1Id, player2Id },
        { player1Id: player2Id, player2Id: player1Id },
      ],
    },
  })
  if (active) return { success: false, error: 'These players already have an active match.' }

  const match = await db.match.create({
    data: {
      tournamentId,
      player1Id,
      player2Id,
      targetScore,
      status:      'ACTIVE',   // skip PENDING — create and start immediately
      startedAt:   new Date(),
      recordedById: user.id,
    },
    select: { id: true },
  })

  revalidatePath(`/tournaments/${tournamentId}/matches`)
  return { success: true, data: { id: match.id } }
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
  if (matchComplete) revalidatePath(`/tournaments/${match.tournament.id}/matches`)

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
  if (matchComplete) revalidatePath(`/tournaments/${match.tournamentId}/matches`)
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
