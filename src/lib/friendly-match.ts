/**
 * Shared helpers for 1-on-1 matches outside a regular tournament context
 * (friend challenges and rated matchmaking). Both funnel into a hidden
 * singleton "Friendly Matches" system tournament so they reuse all existing
 * Match / LiveGame / scoring infrastructure built for tournament play.
 */

import { db } from '@/lib/db'

const FRIENDLY_TOURNAMENT_NAME = 'Friendly Matches'
const FRIENDLY_TOURNAMENT_CODE = 'FRIENDLY'
export const FRIENDLY_TARGET_SCORE = 7

/**
 * Atomic upsert keyed on the unique `code` field — race-safe. Two players
 * accepting/matching at the same instant used to both pass a `findFirst`
 * check before either had committed, then both attempt `create`, and the
 * loser threw an unhandled unique-constraint error (crashing the accept
 * with "a server-side exception has occurred"). Upsert closes that window.
 */
export async function getOrCreateFriendlyTournament(creatorId: string) {
  return db.tournament.upsert({
    where:  { code: FRIENDLY_TOURNAMENT_CODE },
    update: {},
    create: {
      name:        FRIENDLY_TOURNAMENT_NAME,
      code:        FRIENDLY_TOURNAMENT_CODE,
      format:      'ROUND_ROBIN',
      status:      'ACTIVE',
      isPrivate:   true,
      isSystem:    true,
      createdById: creatorId,
    },
  })
}

/** Same race fixed here via upsert on the compound unique constraint. */
export async function getOrCreateMember(tournamentId: string, playerId: string) {
  return db.tournamentMember.upsert({
    where:  { unique_member_per_tournament: { tournamentId, playerId } },
    update: {},
    create: { tournamentId, playerId },
  })
}

/** Creates the Match (ACTIVE, ready for LiveGame) between two players inside the friendly tournament. */
export async function createFriendlyMatch(
  player1Id: string,
  player2Id: string,
  recordedById: string,
): Promise<{ tournamentId: string; matchId: string }> {
  const tournament = await getOrCreateFriendlyTournament(player1Id)
  const [member1, member2] = await Promise.all([
    getOrCreateMember(tournament.id, player1Id),
    getOrCreateMember(tournament.id, player2Id),
  ])

  const match = await db.match.create({
    data: {
      tournamentId: tournament.id,
      player1Id:    member1.id,
      player2Id:    member2.id,
      targetScore:  FRIENDLY_TARGET_SCORE,
      status:       'ACTIVE',
      startedAt:    new Date(),
      recordedById,
    },
  })

  return { tournamentId: tournament.id, matchId: match.id }
}
