'use server'

/**
 * Matchmaking — rated "find an opponent" queue.
 *
 * No realtime infra required: each client polls every few seconds. Joining
 * the queue creates a WAITING ticket with a rating snapshot. Any poll (from
 * either queued player) may find another compatible WAITING ticket and pair
 * them — whichever poll gets there first does the pairing, guarded by a
 * conditional update so only one request can claim a given ticket.
 *
 * Rating tolerance widens the longer a player waits, so queues with few
 * players still resolve (just with a looser skill match) instead of hanging.
 */

import { db }                  from '@/lib/db'
import { requireSessionUser }  from '@/lib/session'
import { createFriendlyMatch } from '@/lib/friendly-match'
import type { ActionResult }   from '@/types'

const BASE_TOLERANCE  = 100   // rating points, at queue time
const TOLERANCE_GROWTH = 40   // additional tolerance per 10s waited
const MAX_TOLERANCE    = 1000 // effectively "anyone" once waited long enough
const MAX_WAIT_MS      = 90_000 // give up searching after 90s with no opponent online

function toleranceFor(waitedMs: number): number {
  const steps = Math.floor(waitedMs / 10_000)
  return Math.min(MAX_TOLERANCE, BASE_TOLERANCE + steps * TOLERANCE_GROWTH)
}

export interface MatchmakingPollResult {
  state:        'idle' | 'waiting' | 'matched'
  rating:       number
  waitedMs?:    number
  tournamentId?: string
  matchId?:      string
  timedOut?:    boolean
}

// ─────────────────────────────────────────────────────────────────────────────
// JOIN
// ─────────────────────────────────────────────────────────────────────────────

export async function joinMatchmakingQueue(): Promise<ActionResult<MatchmakingPollResult>> {
  const user = await requireSessionUser()

  const player = await db.player.findUnique({ where: { id: user.id }, select: { rating: true, isSuspended: true } })
  if (!player) return { success: false, error: 'Player not found.' }
  if (player.isSuspended) return { success: false, error: 'Your account is suspended.' }

  await db.matchmakingTicket.upsert({
    where:  { playerId: user.id },
    update: { status: 'WAITING', rating: player.rating, matchId: null, tournamentId: null },
    create: { playerId: user.id, rating: player.rating, status: 'WAITING' },
  })

  return pollMatchmaking()
}

// ─────────────────────────────────────────────────────────────────────────────
// LEAVE
// ─────────────────────────────────────────────────────────────────────────────

export async function leaveMatchmakingQueue(): Promise<ActionResult<void>> {
  const user = await requireSessionUser()
  await db.matchmakingTicket.deleteMany({ where: { playerId: user.id, status: 'WAITING' } })
  return { success: true, data: undefined }
}

// ─────────────────────────────────────────────────────────────────────────────
// POLL — checks my own ticket; opportunistically pairs if still WAITING
// ─────────────────────────────────────────────────────────────────────────────

export async function pollMatchmaking(): Promise<ActionResult<MatchmakingPollResult>> {
  const user = await requireSessionUser()

  const mine = await db.matchmakingTicket.findUnique({ where: { playerId: user.id } })
  if (!mine) {
    const player = await db.player.findUnique({ where: { id: user.id }, select: { rating: true } })
    return { success: true, data: { state: 'idle', rating: player?.rating ?? 1500 } }
  }

  if (mine.status === 'MATCHED' && mine.tournamentId && mine.matchId) {
    return {
      success: true,
      data: { state: 'matched', rating: mine.rating, tournamentId: mine.tournamentId, matchId: mine.matchId },
    }
  }

  if (mine.status !== 'WAITING') {
    return { success: true, data: { state: 'idle', rating: mine.rating } }
  }

  const waitedMs = Date.now() - mine.createdAt.getTime()

  if (waitedMs > MAX_WAIT_MS) {
    await db.matchmakingTicket.deleteMany({ where: { id: mine.id, status: 'WAITING' } })
    return { success: true, data: { state: 'idle', rating: mine.rating, timedOut: true } }
  }

  const tolerance = toleranceFor(waitedMs)

  const candidate = await db.matchmakingTicket.findFirst({
    where: {
      status:   'WAITING',
      playerId: { not: user.id },
      rating:   { gte: mine.rating - tolerance, lte: mine.rating + tolerance },
    },
    orderBy: { createdAt: 'asc' },
  })

  if (candidate) {
    // Claim both tickets atomically; if either is already claimed by a
    // concurrent poll, the updateMany count will be 0 and we abort.
    const claimedMine = await db.matchmakingTicket.updateMany({
      where: { id: mine.id, status: 'WAITING' },
      data:  { status: 'MATCHED' },
    })
    const claimedTheirs = claimedMine.count === 1
      ? await db.matchmakingTicket.updateMany({
          where: { id: candidate.id, status: 'WAITING' },
          data:  { status: 'MATCHED' },
        })
      : { count: 0 }

    if (claimedMine.count === 1 && claimedTheirs.count === 1) {
      const { tournamentId, matchId } = await createFriendlyMatch(mine.playerId, candidate.playerId, user.id)
      await Promise.all([
        db.matchmakingTicket.update({ where: { id: mine.id },      data: { tournamentId, matchId } }),
        db.matchmakingTicket.update({ where: { id: candidate.id }, data: { tournamentId, matchId } }),
      ])
      return { success: true, data: { state: 'matched', rating: mine.rating, tournamentId, matchId } }
    }

    // Lost the race — revert my own ticket back to WAITING if it was claimed but the pairing failed.
    if (claimedMine.count === 1 && claimedTheirs.count === 0) {
      await db.matchmakingTicket.update({ where: { id: mine.id }, data: { status: 'WAITING' } })
    }
  }

  return { success: true, data: { state: 'waiting', rating: mine.rating, waitedMs } }
}
