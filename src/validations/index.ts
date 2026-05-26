/**
 * Zod validation schemas for all Server Action payloads.
 * Run on the server before any DB operation — never trust client input.
 */

import { z } from 'zod'
import { CUBE_VALUES } from '../types'

// ─────────────────────────────────────────────────────────────────────────────
// AUTH
// ─────────────────────────────────────────────────────────────────────────────

export const loginSchema = z.object({
  email:    z.string().email('Enter a valid email address').toLowerCase().trim(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

export const registerSchema = z
  .object({
    name:            z.string().min(1, 'Name is required').max(50).trim(),
    email:           z.string().email('Enter a valid email address').toLowerCase().trim(),
    password:        z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
  })
  .refine(data => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path:    ['confirmPassword'],
  })

// ─────────────────────────────────────────────────────────────────────────────
// SHARED
// ─────────────────────────────────────────────────────────────────────────────

const uuidSchema = z.string().uuid('Invalid ID')

// ─────────────────────────────────────────────────────────────────────────────
// TOURNAMENT
// ─────────────────────────────────────────────────────────────────────────────

export const createTournamentSchema = z.object({
  name:         z.string().min(1, 'Tournament name is required').max(80).trim(),
  description:  z.string().max(500).trim().optional(),
  location:     z.string().max(80).trim().optional(),
  format:       z.enum(['ROUND_ROBIN', 'SINGLE_ELIMINATION', 'DOUBLE_ELIMINATION', 'SWISS']),
  pointsPerWin: z.number().int().min(1).max(1000),
  matchLength:  z.number().int().min(1).max(99).optional(),
  maxPlayers:   z.number().int().min(2).max(500).optional(),
  startDate:    z.string().optional(),   // ISO date string, validated loosely
})

export const updateTournamentStatusSchema = z.object({
  tournamentId: uuidSchema,
  status:       z.enum(['DRAFT', 'ACTIVE', 'COMPLETED', 'ARCHIVED']),
})

export const deleteTournamentSchema = z.object({
  tournamentId: uuidSchema,
})

export const archiveTournamentSchema = z.object({
  tournamentId: uuidSchema,
})

export const joinTournamentSchema = z.object({
  code: z.string().length(6, 'Code must be exactly 6 characters').toUpperCase(),
})

// ─────────────────────────────────────────────────────────────────────────────
// MEMBERS
// ─────────────────────────────────────────────────────────────────────────────

export const addRegisteredMemberSchema = z.object({
  tournamentId: uuidSchema,
  email:        z.string().email('Enter a valid email address').toLowerCase().trim(),
})

export const addGuestMemberSchema = z.object({
  tournamentId: uuidSchema,
  guestName:    z.string().min(1, 'Enter a name').max(50).trim(),
})

export const updateMemberStatsSchema = z.object({
  memberId: uuidSchema,
  points:   z.number().int(),
  wins:     z.number().int().min(0),
  losses:   z.number().int().min(0),
})

export const removeMemberSchema = z.object({
  memberId:     uuidSchema,
  tournamentId: uuidSchema,
})

export const updateMemberRoleSchema = z.object({
  memberId: uuidSchema,
  role:     z.enum(['ORGANIZER', 'PARTICIPANT']),
})

export const searchPlayersSchema = z.object({
  query: z.string().min(1).max(100).trim(),
})

// ─────────────────────────────────────────────────────────────────────────────
// GAMES
// ─────────────────────────────────────────────────────────────────────────────

export const recordGameSchema = z
  .object({
    tournamentId: uuidSchema,
    winnerId:     uuidSchema,
    loserId:      uuidSchema,
    multiplier:   z.union([
      z.literal(1), z.literal(2), z.literal(4), z.literal(8),
      z.literal(16), z.literal(32), z.literal(64),
    ]),
    gameType: z.enum(['NORMAL', 'GAMMON', 'BACKGAMMON']),
    notes:    z.string().max(500).trim().optional(),
  })
  .refine(data => data.winnerId !== data.loserId, {
    message: 'Winner and loser must be different players',
    path:    ['loserId'],
  })

export const deleteGameSchema = z.object({
  gameId:       uuidSchema,
  tournamentId: uuidSchema,
})

// ─────────────────────────────────────────────────────────────────────────────
// MATCHES
// ─────────────────────────────────────────────────────────────────────────────

export const createMatchSchema = z
  .object({
    tournamentId: uuidSchema,
    player1Id:    uuidSchema,
    player2Id:    uuidSchema,
    targetScore:  z.number().int().min(1).max(99),
  })
  .refine(d => d.player1Id !== d.player2Id, {
    message: 'A player cannot play against themselves',
    path:    ['player2Id'],
  })

const gameTypeEnum = z.enum(['NORMAL', 'GAMMON', 'BACKGAMMON'])

export const recordMatchGameSchema = z
  .object({
    matchId:  uuidSchema,
    winnerId: uuidSchema,
    gameType: gameTypeEnum,
  })

export const acceptDoubleSchema = z.object({
  matchId:    uuidSchema,
  acceptorId: uuidSchema,
})

export const declineDoubleSchema = z.object({
  matchId:   uuidSchema,
  offererId: uuidSchema,
})

export const completeMatchSchema = z.object({
  matchId:     uuidSchema,
  openingType: z.enum([
    'RUNNING_GAME', 'BLITZ', 'PRIME_VS_PRIME',
    'BACK_GAME', 'HOLDING_GAME', 'ANCHOR_GAME', 'CUSTOM',
  ]).optional(),
  notes: z.string().max(500).trim().optional(),
})

export const setScoreSchema = z.object({
  matchId:      uuidSchema,
  player1Score: z.number().int().min(0),
  player2Score: z.number().int().min(0),
})

// ─────────────────────────────────────────────────────────────────────────────
// INFERRED TYPES
// ─────────────────────────────────────────────────────────────────────────────

export type LoginInput                  = z.infer<typeof loginSchema>
export type RegisterInput               = z.infer<typeof registerSchema>
export type CreateTournamentInput       = z.infer<typeof createTournamentSchema>
export type UpdateTournamentStatusInput = z.infer<typeof updateTournamentStatusSchema>
export type DeleteTournamentInput       = z.infer<typeof deleteTournamentSchema>
export type ArchiveTournamentInput      = z.infer<typeof archiveTournamentSchema>
export type JoinTournamentInput         = z.infer<typeof joinTournamentSchema>
export type RecordGameInput             = z.infer<typeof recordGameSchema>
export type UpdateMemberInput           = z.infer<typeof updateMemberStatsSchema>
export type AddGuestInput               = z.infer<typeof addGuestMemberSchema>
export type AddRegisteredInput          = z.infer<typeof addRegisteredMemberSchema>
export type RemoveMemberInput           = z.infer<typeof removeMemberSchema>
export type UpdateMemberRoleInput       = z.infer<typeof updateMemberRoleSchema>
export type CreateMatchInput            = z.infer<typeof createMatchSchema>
export type RecordMatchGameInput        = z.infer<typeof recordMatchGameSchema>
export type AcceptDoubleInput           = z.infer<typeof acceptDoubleSchema>
export type DeclineDoubleInput          = z.infer<typeof declineDoubleSchema>
export type CompleteMatchInput          = z.infer<typeof completeMatchSchema>
