'use server'

/**
 * Challenge — invite any other player to a 1-on-1 live game.
 *
 * On accept, both players are auto-joined into a hidden singleton system
 * tournament ("Friendly Matches") and a Match + LiveGame is created inside
 * it, reusing all existing scoring / cube / realtime infrastructure built
 * for tournament matches.
 */

import { db }                  from '@/lib/db'
import { requireSessionUser }  from '@/lib/session'
import { createFriendlyMatch } from '@/lib/friendly-match'
import type { ActionResult }   from '@/types'

// ─────────────────────────────────────────────────────────────────────────────
// SEND
// ─────────────────────────────────────────────────────────────────────────────

export async function sendChallenge(toPlayerId: string): Promise<ActionResult<{ challengeId: string }>> {
  const user = await requireSessionUser()
  if (user.id === toPlayerId) return { success: false, error: 'You cannot challenge yourself.' }

  const target = await db.player.findUnique({
    where:  { id: toPlayerId },
    select: { id: true, isSuspended: true },
  })
  if (!target) return { success: false, error: 'Player not found.' }
  if (target.isSuspended) return { success: false, error: 'This player is suspended.' }

  const existing = await db.challenge.findFirst({
    where: { fromId: user.id, toId: toPlayerId, status: 'PENDING' },
  })
  if (existing) return { success: true, data: { challengeId: existing.id } }

  const challenge = await db.challenge.create({
    data: { fromId: user.id, toId: toPlayerId, status: 'PENDING' },
  })
  return { success: true, data: { challengeId: challenge.id } }
}

// ─────────────────────────────────────────────────────────────────────────────
// RESPOND
// ─────────────────────────────────────────────────────────────────────────────

export async function respondChallenge(
  challengeId: string,
  accept: boolean,
): Promise<ActionResult<{ tournamentId: string; matchId: string } | null>> {
  const user = await requireSessionUser()

  const challenge = await db.challenge.findUnique({ where: { id: challengeId } })
  if (!challenge) return { success: false, error: 'Challenge not found.' }
  if (challenge.toId !== user.id) return { success: false, error: 'This challenge is not addressed to you.' }
  if (challenge.status !== 'PENDING') return { success: false, error: 'This challenge is no longer pending.' }

  if (!accept) {
    await db.challenge.update({ where: { id: challengeId }, data: { status: 'DECLINED' } })
    return { success: true, data: null }
  }

  const { tournamentId, matchId } = await createFriendlyMatch(challenge.fromId, challenge.toId, user.id)

  await db.challenge.update({
    where: { id: challengeId },
    data:  { status: 'ACCEPTED', tournamentId, matchId },
  })

  return { success: true, data: { tournamentId, matchId } }
}

// ─────────────────────────────────────────────────────────────────────────────
// CANCEL (sender withdraws an unanswered challenge)
// ─────────────────────────────────────────────────────────────────────────────

export async function cancelChallenge(challengeId: string): Promise<ActionResult<void>> {
  const user = await requireSessionUser()

  const challenge = await db.challenge.findUnique({ where: { id: challengeId } })
  if (!challenge) return { success: false, error: 'Challenge not found.' }
  if (challenge.fromId !== user.id) return { success: false, error: 'Not your challenge.' }
  if (challenge.status !== 'PENDING') return { success: false, error: 'This challenge is no longer pending.' }

  await db.challenge.update({ where: { id: challengeId }, data: { status: 'CANCELLED' } })
  return { success: true, data: undefined }
}

// ─────────────────────────────────────────────────────────────────────────────
// INBOX — polled by the global ChallengeInbox listener
// ─────────────────────────────────────────────────────────────────────────────

export interface IncomingChallenge {
  id:         string
  fromId:     string
  fromName:   string
  fromAvatar: string | null
  createdAt:  Date
}

export async function getPendingIncomingChallenges(): Promise<IncomingChallenge[]> {
  const user = await requireSessionUser()
  const rows = await db.challenge.findMany({
    where:   { toId: user.id, status: 'PENDING' },
    include: { from: { select: { id: true, name: true, avatarUrl: true } } },
    orderBy: { createdAt: 'desc' },
  })
  return rows.map(r => ({
    id:         r.id,
    fromId:     r.fromId,
    fromName:   r.from.name,
    fromAvatar: r.from.avatarUrl,
    createdAt:  r.createdAt,
  }))
}

/** Lets the sender know if their outgoing challenge was accepted, to auto-redirect them too. */
export async function getOutgoingChallengeStatus(
  challengeId: string,
): Promise<{ status: string; tournamentId: string | null; matchId: string | null } | null> {
  const user = await requireSessionUser()
  const challenge = await db.challenge.findUnique({ where: { id: challengeId } })
  if (!challenge || challenge.fromId !== user.id) return null
  return { status: challenge.status, tournamentId: challenge.tournamentId, matchId: challenge.matchId }
}
