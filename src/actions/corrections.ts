'use server'

import { revalidatePath }     from 'next/cache'
import { z }                  from 'zod'
import { db }                 from '@/lib/db'
import { requireSessionUser } from '@/lib/session'
import { GAME_TYPE_MULTIPLIER, type ActionResult, type GameType } from '@/types'

// Organizer corrections after a result was recorded. Every change re-derives the
// match score from its game log (or an explicit override) and then rebuilds the
// whole tournament's standings, so cached wins/losses/points can never drift.

const TX_OPTS = { timeout: 20_000, maxWait: 10_000 }

type Tx = Parameters<Parameters<typeof db.$transaction>[0]>[0]

const gameTypeSchema = z.enum(['NORMAL', 'GAMMON', 'BACKGAMMON'])
const sideSchema     = z.union([z.literal(1), z.literal(2)])
const cubeSchema     = z.number().int().refine(v => [1, 2, 4, 8, 16, 32, 64].includes(v), 'Invalid cube value')

async function requireOrganizer(tournamentId: string) {
  const user = await requireSessionUser()
  const t = await db.tournament.findUnique({
    where:  { id: tournamentId },
    select: { createdById: true, isSystem: true },
  })
  if (!t) throw new Error('Tournament not found.')
  if (t.isSystem) throw new Error('Ranked friendly matches cannot be edited.')
  if (user.role === 'ADMIN' || user.role === 'TOURNAMENT_MANAGER' || t.createdById === user.id) return user
  const org = await db.tournamentMember.findFirst({
    where:  { tournamentId, playerId: user.id, memberRole: 'ORGANIZER' },
    select: { id: true },
  })
  if (!org) throw new Error('Only the tournament organizer can correct results.')
  return user
}

export async function canCorrectTournament(tournamentId: string): Promise<boolean> {
  try { await requireOrganizer(tournamentId); return true } catch { return false }
}

async function rebuildStandings(tx: Tx, tournamentId: string) {
  const [t, members, matches] = await Promise.all([
    tx.tournament.findUniqueOrThrow({ where: { id: tournamentId }, select: { pointsPerWin: true } }),
    tx.tournamentMember.findMany({ where: { tournamentId }, select: { id: true, pointsAdjustment: true } }),
    tx.match.findMany({
      where:  { tournamentId, status: 'COMPLETED', winnerId: { not: null } },
      select: { winnerId: true, player1Id: true, player2Id: true },
    }),
  ])
  for (const m of members) {
    const wins   = matches.filter(x => x.winnerId === m.id).length
    const losses = matches.filter(x => x.winnerId !== m.id && (x.player1Id === m.id || x.player2Id === m.id)).length
    await tx.tournamentMember.update({
      where: { id: m.id },
      data:  { wins, losses, points: wins * t.pointsPerWin + m.pointsAdjustment },
    })
  }
}

/**
 * Applies new scores to a match and works out the result:
 * an already-completed match stays completed with the higher score winning;
 * an unfinished match completes once someone reaches the target.
 */
async function applyMatchScores(tx: Tx, matchId: string, p1: number, p2: number, editorId: string) {
  const m = await tx.match.findUniqueOrThrow({
    where:  { id: matchId },
    select: {
      status: true, targetScore: true, winnerId: true, player1Id: true, player2Id: true,
      nextMatchId: true, nextMatchSlot: true, startedAt: true, completedAt: true,
    },
  })
  if (!m.player1Id || !m.player2Id) throw new Error('Both players must be set before editing scores.')

  const reached = p1 >= m.targetScore || p2 >= m.targetScore
  const completes = m.status === 'COMPLETED' || reached
  if (completes && p1 === p2) throw new Error('A finished match cannot end in a tie — adjust one score.')
  const winnerId = completes ? (p1 > p2 ? m.player1Id : m.player2Id) : null

  if (m.nextMatchId && m.nextMatchSlot && winnerId !== m.winnerId) {
    const next = await tx.match.findUniqueOrThrow({
      where:  { id: m.nextMatchId },
      select: { status: true, _count: { select: { games: true } } },
    })
    if (next.status !== 'PENDING' || next._count.games > 0) {
      throw new Error('The next bracket match has already started, so the winner of this match can no longer change.')
    }
    await tx.match.update({
      where: { id: m.nextMatchId },
      data:  m.nextMatchSlot === 1 ? { player1Id: winnerId } : { player2Id: winnerId },
    })
  }

  await tx.match.update({
    where: { id: matchId },
    data: {
      player1Score: p1,
      player2Score: p2,
      winnerId,
      status:      completes ? 'COMPLETED' : m.status,
      completedAt: completes ? (m.completedAt ?? new Date()) : null,
      cubeValue:   1,
      cubeOwnerId: null,
      editedAt:    new Date(),
      editedById:  editorId,
    },
  })
}

async function scoresFromGames(tx: Tx, matchId: string) {
  const m = await tx.match.findUniqueOrThrow({
    where:  { id: matchId },
    select: { player1Id: true, games: { select: { winnerId: true, pointsAwarded: true } } },
  })
  let p1 = 0, p2 = 0
  for (const g of m.games) {
    if (g.winnerId === m.player1Id) p1 += g.pointsAwarded
    else p2 += g.pointsAwarded
  }
  return { p1, p2 }
}

function revalidateMatch(tournamentId: string, matchId: string) {
  revalidatePath(`/tournaments/${tournamentId}`)
  revalidatePath(`/tournaments/${tournamentId}/matches`)
  revalidatePath(`/tournaments/${tournamentId}/matches/${matchId}`)
  revalidatePath(`/tournaments/${tournamentId}/standings`)
}

async function run<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { success: true, data: await fn() }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Something went wrong.' }
  }
}

async function loadMatchForEdit(matchId: string) {
  const m = await db.match.findUnique({
    where:  { id: matchId },
    select: { tournamentId: true, player1Id: true, player2Id: true },
  })
  if (!m) throw new Error('Match not found.')
  if (!m.player1Id || !m.player2Id) throw new Error('Both players must be set before editing.')
  return m as { tournamentId: string; player1Id: string; player2Id: string }
}

// ── Game-level corrections ───────────────────────────────────────────────────

const gameInput = z.object({
  winnerSide: sideSchema,
  gameType:   gameTypeSchema,
  cubeValue:  cubeSchema,
})

export async function editMatchGame(input: unknown): Promise<ActionResult> {
  return run(async () => {
    const d = gameInput.extend({ gameId: z.string().uuid() }).parse(input)
    const g = await db.matchGame.findUnique({ where: { id: d.gameId }, select: { matchId: true } })
    if (!g) throw new Error('Game not found.')
    const m = await loadMatchForEdit(g.matchId)
    const user = await requireOrganizer(m.tournamentId)

    const [winnerId, loserId] = d.winnerSide === 1 ? [m.player1Id, m.player2Id] : [m.player2Id, m.player1Id]
    await db.$transaction(async tx => {
      await tx.matchGame.update({
        where: { id: d.gameId },
        data:  {
          winnerId, loserId,
          gameType:      d.gameType,
          cubeValue:     d.cubeValue,
          pointsAwarded: d.cubeValue * GAME_TYPE_MULTIPLIER[d.gameType as GameType],
        },
      })
      const { p1, p2 } = await scoresFromGames(tx, g.matchId)
      await applyMatchScores(tx, g.matchId, p1, p2, user.id)
      await rebuildStandings(tx, m.tournamentId)
    }, TX_OPTS)
    revalidateMatch(m.tournamentId, g.matchId)
  })
}

export async function addMatchGame(input: unknown): Promise<ActionResult> {
  return run(async () => {
    const d = gameInput.extend({ matchId: z.string().uuid() }).parse(input)
    const m = await loadMatchForEdit(d.matchId)
    const user = await requireOrganizer(m.tournamentId)

    const [winnerId, loserId] = d.winnerSide === 1 ? [m.player1Id, m.player2Id] : [m.player2Id, m.player1Id]
    await db.$transaction(async tx => {
      const last = await tx.matchGame.findFirst({ where: { matchId: d.matchId }, orderBy: { gameNumber: 'desc' }, select: { gameNumber: true } })
      await tx.matchGame.create({
        data: {
          matchId: d.matchId, winnerId, loserId,
          gameNumber:    (last?.gameNumber ?? 0) + 1,
          gameType:      d.gameType,
          cubeValue:     d.cubeValue,
          pointsAwarded: d.cubeValue * GAME_TYPE_MULTIPLIER[d.gameType as GameType],
        },
      })
      const { p1, p2 } = await scoresFromGames(tx, d.matchId)
      await applyMatchScores(tx, d.matchId, p1, p2, user.id)
      await rebuildStandings(tx, m.tournamentId)
    }, TX_OPTS)
    revalidateMatch(m.tournamentId, d.matchId)
  })
}

export async function deleteMatchGame(gameId: string): Promise<ActionResult> {
  return run(async () => {
    const g = await db.matchGame.findUnique({ where: { id: z.string().uuid().parse(gameId) }, select: { matchId: true } })
    if (!g) throw new Error('Game not found.')
    const m = await loadMatchForEdit(g.matchId)
    const user = await requireOrganizer(m.tournamentId)

    await db.$transaction(async tx => {
      await tx.matchGame.delete({ where: { id: gameId } })
      const rest = await tx.matchGame.findMany({ where: { matchId: g.matchId }, orderBy: { gameNumber: 'asc' }, select: { id: true } })
      for (let i = 0; i < rest.length; i++) {
        await tx.matchGame.update({ where: { id: rest[i].id }, data: { gameNumber: i + 1 } })
      }
      const { p1, p2 } = await scoresFromGames(tx, g.matchId)
      await applyMatchScores(tx, g.matchId, p1, p2, user.id)
      await rebuildStandings(tx, m.tournamentId)
    }, TX_OPTS)
    revalidateMatch(m.tournamentId, g.matchId)
  })
}

// ── Match-level override ─────────────────────────────────────────────────────

export async function overrideMatchScore(input: unknown): Promise<ActionResult> {
  return run(async () => {
    const d = z.object({
      matchId:      z.string().uuid(),
      player1Score: z.number().int().min(0).max(999),
      player2Score: z.number().int().min(0).max(999),
    }).parse(input)
    const m = await loadMatchForEdit(d.matchId)
    const user = await requireOrganizer(m.tournamentId)

    await db.$transaction(async tx => {
      await applyMatchScores(tx, d.matchId, d.player1Score, d.player2Score, user.id)
      await rebuildStandings(tx, m.tournamentId)
    }, TX_OPTS)
    revalidateMatch(m.tournamentId, d.matchId)
  })
}

// ── Standings adjustment ─────────────────────────────────────────────────────

export async function setPointsAdjustment(input: unknown): Promise<ActionResult> {
  return run(async () => {
    const d = z.object({
      memberId:   z.string().uuid(),
      adjustment: z.number().int().min(-999).max(999),
    }).parse(input)
    const member = await db.tournamentMember.findUnique({ where: { id: d.memberId }, select: { tournamentId: true } })
    if (!member) throw new Error('Player not found.')
    await requireOrganizer(member.tournamentId)

    await db.$transaction(async tx => {
      await tx.tournamentMember.update({ where: { id: d.memberId }, data: { pointsAdjustment: d.adjustment } })
      await rebuildStandings(tx, member.tournamentId)
    }, TX_OPTS)
    revalidatePath(`/tournaments/${member.tournamentId}`)
    revalidatePath(`/tournaments/${member.tournamentId}/standings`)
  })
}
