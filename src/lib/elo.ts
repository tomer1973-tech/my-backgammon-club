/**
 * ELO-style rating update for completed ranked matches.
 *
 * "Ranked" = a match played inside the hidden "Friendly Matches" system
 * tournament (challenges + matchmaking), between two real registered
 * players. Regular tournament matches don't affect rating — tournaments have
 * their own points system and aren't necessarily skill-matched 1-on-1 play.
 */

import { db } from '@/lib/db'

const K_FACTOR = 32

/** Call after a Match row has been set to COMPLETED with a winnerId. */
export async function applyEloIfRated(matchId: string): Promise<void> {
  const match = await db.match.findUnique({
    where:  { id: matchId },
    select: {
      winnerId:  true,
      player1Id: true,
      player2Id: true,
      tournament: { select: { isSystem: true } },
      player1:   { select: { playerId: true } },
      player2:   { select: { playerId: true } },
    },
  })
  if (!match || !match.tournament.isSystem || !match.winnerId) return

  const winnerIsP1 = match.winnerId === match.player1Id
  const winnerPlayerId = winnerIsP1 ? match.player1?.playerId : match.player2?.playerId
  const loserPlayerId  = winnerIsP1 ? match.player2?.playerId : match.player1?.playerId
  if (!winnerPlayerId || !loserPlayerId) return // guests aren't rated

  const [winner, loser] = await Promise.all([
    db.player.findUnique({ where: { id: winnerPlayerId }, select: { rating: true } }),
    db.player.findUnique({ where: { id: loserPlayerId },  select: { rating: true } }),
  ])
  if (!winner || !loser) return

  const expectedWinner = 1 / (1 + Math.pow(10, (loser.rating - winner.rating) / 400))
  const delta = Math.max(1, Math.round(K_FACTOR * (1 - expectedWinner)))

  await db.$transaction([
    db.player.update({
      where: { id: winnerPlayerId },
      data:  { rating: { increment: delta }, ratedGames: { increment: 1 } },
    }),
    db.player.update({
      where: { id: loserPlayerId },
      data:  { rating: { decrement: delta }, ratedGames: { increment: 1 } },
    }),
  ])
}
