'use server'

/**
 * Live Game — Server Actions
 *
 * Persists the in-progress board state for an online backgammon game played
 * directly inside a Match. One `LiveGame` row exists per Match and is reset
 * in place for each successive game. Clients sync via Supabase Realtime
 * broadcast on channel `live-game-{id}`, using this row as the source of
 * truth on first load / reconnect.
 *
 * Authorization: only the two players of the match (player1/player2, matched
 * by `TournamentMember.playerId === SessionUser.id`) may read or act on a
 * live game. Each player is assigned a fixed `Player` color ('white' |
 * 'black') for the current game via `LiveGame.player1Color`, alternating
 * each game.
 */

import { revalidatePath }     from 'next/cache'
import { db }                 from '@/lib/db'
import { requireSessionUser } from '@/lib/session'
import { recordGameInMatch }  from './match'
import {
  createInitialBoard, rollDice, getLegalSequences, applyMove, isSequencePrefix,
  isGameOver, getGameType, opponent,
  type Board, type Player, type Dice, type Move, type GameType,
} from '@/lib/backgammon'
import type { ActionResult } from '@/types'

export interface LiveGameData {
  id:             string
  matchId:        string
  gameNumber:     number
  board:          Board
  turnStartBoard: Board
  currentPlayer:  Player
  dice:           Dice | null
  movesPlayed:    Move[]
  cubeValue:      number
  cubeOwner:      Player | null
  doubleOffer:    Player | null
  player1Color:   Player
  status:         'PLAYING' | 'FINISHED'
  winner:         Player | null
}

type PrismaLiveGame = {
  id: string; matchId: string; gameNumber: number
  board: unknown; turnStartBoard: unknown; currentPlayer: string; dice: unknown; movesPlayed: unknown
  cubeValue: number; cubeOwner: string | null; doubleOffer: string | null
  player1Color: string; status: string; winner: string | null
}

function shape(g: PrismaLiveGame): LiveGameData {
  return {
    id:             g.id,
    matchId:        g.matchId,
    gameNumber:     g.gameNumber,
    board:          g.board as Board,
    turnStartBoard: g.turnStartBoard as Board,
    currentPlayer:  g.currentPlayer as Player,
    dice:           g.dice as Dice | null,
    movesPlayed:    g.movesPlayed as Move[],
    cubeValue:      g.cubeValue,
    cubeOwner:      g.cubeOwner as Player | null,
    doubleOffer:    g.doubleOffer as Player | null,
    player1Color:   g.player1Color as Player,
    status:         g.status as 'PLAYING' | 'FINISHED',
    winner:         g.winner as Player | null,
  }
}

function rollOpening(): { player: Player; dice: Dice } {
  let dice: Dice
  do { dice = rollDice() } while (dice[0] === dice[1])
  return { player: dice[0] > dice[1] ? 'white' : 'black', dice }
}

const matchMemberSelect = {
  id:       true,
  tournamentId: true,
  status:   true,
  cubeValue: true,
  player1Id: true,
  player2Id: true,
  player1: { select: { playerId: true } },
  player2: { select: { playerId: true } },
} as const

type MatchForLive = NonNullable<Awaited<ReturnType<typeof loadMatch>>>

async function loadMatch(matchId: string) {
  return db.match.findUnique({ where: { id: matchId }, select: matchMemberSelect })
}

/** The color the given user plays in this game, or null if they're not a participant. */
function colorForUser(match: MatchForLive, player1Color: Player, userId: string): Player | null {
  if (match.player1.playerId === userId) return player1Color
  if (match.player2.playerId === userId) return opponent(player1Color)
  return null
}

// ─────────────────────────────────────────────────────────────────────────────
// GET OR CREATE
// ─────────────────────────────────────────────────────────────────────────────

export async function getOrCreateLiveGame(
  matchId: string,
): Promise<ActionResult<{ liveGame: LiveGameData; myColor: Player | null }>> {
  const user = await requireSessionUser()

  const match = await loadMatch(matchId)
  if (!match) return { success: false, error: 'Match not found.' }
  if (match.status !== 'ACTIVE' && match.status !== 'COMPLETED') {
    return { success: false, error: 'This match has not started yet.' }
  }

  const existing = await db.liveGame.findUnique({ where: { matchId } })

  // Fresh game — no row yet
  if (!existing) {
    if (match.status !== 'ACTIVE') return { success: false, error: 'This match is over.' }
    const { player, dice } = rollOpening()
    const initialBoard = createInitialBoard() as object
    const created = await db.liveGame.create({
      data: {
        matchId,
        gameNumber:     1,
        board:          initialBoard,
        turnStartBoard: initialBoard,
        currentPlayer:  player,
        dice:           dice as unknown as object,
        movesPlayed:    [],
        player1Color:   'white',
      },
    })
    const liveGame = shape(created)
    return { success: true, data: { liveGame, myColor: colorForUser(match, liveGame.player1Color, user.id) } }
  }

  // Previous game finished — start the next one (alternating colors)
  if (existing.status === 'FINISHED' && match.status === 'ACTIVE') {
    const { player, dice } = rollOpening()
    const nextPlayer1Color: Player = (existing.player1Color === 'white') ? 'black' : 'white'
    const initialBoard = createInitialBoard() as object
    const updated = await db.liveGame.update({
      where: { matchId },
      data: {
        gameNumber:     existing.gameNumber + 1,
        board:          initialBoard,
        turnStartBoard: initialBoard,
        currentPlayer:  player,
        dice:           dice as unknown as object,
        movesPlayed:    [],
        cubeValue:      1,
        cubeOwner:      null,
        doubleOffer:    null,
        player1Color:   nextPlayer1Color,
        status:         'PLAYING',
        winner:         null,
      },
    })
    const liveGame = shape(updated)
    return { success: true, data: { liveGame, myColor: colorForUser(match, liveGame.player1Color, user.id) } }
  }

  const liveGame = shape(existing)
  return { success: true, data: { liveGame, myColor: colorForUser(match, liveGame.player1Color, user.id) } }
}

// ─────────────────────────────────────────────────────────────────────────────
// FINISH A GAME — feed the result back into the Match
// ─────────────────────────────────────────────────────────────────────────────

async function finishLiveGame(
  liveGameId: string,
  match: MatchForLive,
  player1Color: Player,
  cubeValue: number,
  winner: Player,
  gameType: GameType,
): Promise<void> {
  const winnerId = winner === player1Color ? match.player1Id : match.player2Id

  // recordGameInMatch reads the Match's own cubeValue for points — sync it first.
  await db.match.update({ where: { id: match.id }, data: { cubeValue } })

  await recordGameInMatch({ matchId: match.id, winnerId, gameType })

  await db.liveGame.update({
    where: { matchId: match.id },
    data:  { status: 'FINISHED', winner, doubleOffer: null },
  })

  revalidatePath(`/tournaments/${match.tournamentId}/matches/${match.id}`)
  revalidatePath(`/tournaments/${match.tournamentId}/matches/${match.id}/live`)
}

// ─────────────────────────────────────────────────────────────────────────────
// APPLY A MOVE
// ─────────────────────────────────────────────────────────────────────────────

export async function applyLiveMove(
  liveGameId: string,
  move: Move,
): Promise<ActionResult<LiveGameData>> {
  const user = await requireSessionUser()

  const existing = await db.liveGame.findUnique({ where: { id: liveGameId } })
  if (!existing) return { success: false, error: 'Game not found.' }
  if (existing.status !== 'PLAYING') return { success: false, error: 'This game has ended.' }

  const match = await loadMatch(existing.matchId)
  if (!match) return { success: false, error: 'Match not found.' }

  const live = shape(existing)
  const myColor = colorForUser(match, live.player1Color, user.id)
  if (!myColor) return { success: false, error: 'You are not a player in this match.' }
  if (myColor !== live.currentPlayer) return { success: false, error: "It's not your turn." }
  if (!live.dice) return { success: false, error: 'Dice have not been rolled yet.' }

  const sequences = getLegalSequences(live.board, live.currentPlayer, live.dice)
  const candidate = [...live.movesPlayed, move]
  const valid = sequences.some(seq => isSequencePrefix(candidate, seq.moves))
  if (!valid) return { success: false, error: 'Illegal move.' }

  const newBoard = applyMove(live.board, live.currentPlayer, move)
  const newMovesPlayed = candidate

  const winner = isGameOver(newBoard)
  if (winner) {
    const gameType = getGameType(newBoard, winner)
    await db.liveGame.update({
      where: { id: liveGameId },
      data:  { board: newBoard as object, movesPlayed: newMovesPlayed as unknown as object },
    })
    await finishLiveGame(liveGameId, match, live.player1Color, live.cubeValue, winner, gameType)
    const finished = await db.liveGame.findUniqueOrThrow({ where: { id: liveGameId } })
    return { success: true, data: shape(finished) }
  }

  const updated = await db.liveGame.update({
    where: { id: liveGameId },
    data:  { board: newBoard as object, movesPlayed: newMovesPlayed as unknown as object },
  })
  return { success: true, data: shape(updated) }
}

// ─────────────────────────────────────────────────────────────────────────────
// END TURN — pass dice to the opponent
// ─────────────────────────────────────────────────────────────────────────────

export async function endLiveTurn(liveGameId: string): Promise<ActionResult<LiveGameData>> {
  const user = await requireSessionUser()

  const existing = await db.liveGame.findUnique({ where: { id: liveGameId } })
  if (!existing) return { success: false, error: 'Game not found.' }
  if (existing.status !== 'PLAYING') return { success: false, error: 'This game has ended.' }

  const match = await loadMatch(existing.matchId)
  if (!match) return { success: false, error: 'Match not found.' }

  const live = shape(existing)
  const myColor = colorForUser(match, live.player1Color, user.id)
  if (!myColor) return { success: false, error: 'You are not a player in this match.' }
  if (myColor !== live.currentPlayer) return { success: false, error: "It's not your turn." }
  if (!live.dice) return { success: false, error: 'Dice have not been rolled yet.' }

  const sequences = getLegalSequences(live.board, live.currentPlayer, live.dice)
  const turnDone = sequences.every(seq =>
    seq.moves.length <= live.movesPlayed.length || !isSequencePrefix(live.movesPlayed, seq.moves),
  )
  if (!turnDone) return { success: false, error: 'You still have moves to play.' }

  const next = opponent(live.currentPlayer)
  const dice = rollDice()
  const updated = await db.liveGame.update({
    where: { id: liveGameId },
    data: {
      currentPlayer:  next,
      dice:           dice as unknown as object,
      movesPlayed:    [],
      turnStartBoard: live.board as unknown as object,
    },
  })
  return { success: true, data: shape(updated) }
}

// ─────────────────────────────────────────────────────────────────────────────
// UNDO LAST MOVE — replay this turn's moves minus the last one
// ─────────────────────────────────────────────────────────────────────────────

export async function undoLiveMove(liveGameId: string): Promise<ActionResult<LiveGameData>> {
  const user = await requireSessionUser()

  const existing = await db.liveGame.findUnique({ where: { id: liveGameId } })
  if (!existing) return { success: false, error: 'Game not found.' }
  if (existing.status !== 'PLAYING') return { success: false, error: 'This game has ended.' }

  const match = await loadMatch(existing.matchId)
  if (!match) return { success: false, error: 'Match not found.' }

  const live = shape(existing)
  const myColor = colorForUser(match, live.player1Color, user.id)
  if (!myColor) return { success: false, error: 'You are not a player in this match.' }
  if (myColor !== live.currentPlayer) return { success: false, error: "It's not your turn." }
  if (live.movesPlayed.length === 0) return { success: false, error: 'No moves to undo.' }

  const newMovesPlayed = live.movesPlayed.slice(0, -1)
  let board = live.turnStartBoard
  for (const m of newMovesPlayed) board = applyMove(board, live.currentPlayer, m)

  const updated = await db.liveGame.update({
    where: { id: liveGameId },
    data:  { board: board as object, movesPlayed: newMovesPlayed as unknown as object },
  })
  return { success: true, data: shape(updated) }
}

// ─────────────────────────────────────────────────────────────────────────────
// DOUBLING CUBE
// ─────────────────────────────────────────────────────────────────────────────

export async function offerLiveDouble(liveGameId: string): Promise<ActionResult<LiveGameData>> {
  const user = await requireSessionUser()

  const existing = await db.liveGame.findUnique({ where: { id: liveGameId } })
  if (!existing) return { success: false, error: 'Game not found.' }
  if (existing.status !== 'PLAYING') return { success: false, error: 'This game has ended.' }

  const match = await loadMatch(existing.matchId)
  if (!match) return { success: false, error: 'Match not found.' }

  const live = shape(existing)
  const myColor = colorForUser(match, live.player1Color, user.id)
  if (!myColor) return { success: false, error: 'You are not a player in this match.' }
  if (live.doubleOffer) return { success: false, error: 'A double is already pending.' }
  if (live.movesPlayed.length > 0) return { success: false, error: 'You can only double before moving.' }
  if (live.cubeOwner !== null && live.cubeOwner !== myColor) {
    return { success: false, error: "You don't own the cube." }
  }
  if (live.cubeValue >= 64) return { success: false, error: 'Cube is already at maximum (64).' }

  const updated = await db.liveGame.update({
    where: { id: liveGameId },
    data:  { doubleOffer: myColor },
  })
  return { success: true, data: shape(updated) }
}

export async function respondLiveDouble(
  liveGameId: string,
  accept: boolean,
): Promise<ActionResult<LiveGameData>> {
  const user = await requireSessionUser()

  const existing = await db.liveGame.findUnique({ where: { id: liveGameId } })
  if (!existing) return { success: false, error: 'Game not found.' }
  if (existing.status !== 'PLAYING') return { success: false, error: 'This game has ended.' }

  const match = await loadMatch(existing.matchId)
  if (!match) return { success: false, error: 'Match not found.' }

  const live = shape(existing)
  const myColor = colorForUser(match, live.player1Color, user.id)
  if (!myColor) return { success: false, error: 'You are not a player in this match.' }
  if (!live.doubleOffer) return { success: false, error: 'No double is pending.' }
  if (live.doubleOffer === myColor) return { success: false, error: "You can't respond to your own double." }

  if (!accept) {
    await finishLiveGame(liveGameId, match, live.player1Color, live.cubeValue, live.doubleOffer, 'NORMAL')
    const finished = await db.liveGame.findUniqueOrThrow({ where: { id: liveGameId } })
    return { success: true, data: shape(finished) }
  }

  const updated = await db.liveGame.update({
    where: { id: liveGameId },
    data:  { cubeValue: live.cubeValue * 2, cubeOwner: myColor, doubleOffer: null },
  })
  return { success: true, data: shape(updated) }
}
