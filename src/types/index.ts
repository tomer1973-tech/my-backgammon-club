/**
 * Backgammon Tournament Platform — Domain Types
 *
 * These types are derived from the Prisma schema and represent the
 * application's domain model. They are used throughout the app —
 * in Server Actions, API responses, components, and stats utilities.
 *
 * Naming conventions:
 *  - `*Row`     Raw Prisma model shape (DB columns, no joins)
 *  - `*`        Enriched shape used in the UI (includes resolved relations)
 *  - `*Payload` Input shape for mutations (Server Actions / API)
 */

// ─────────────────────────────────────────────────────────────────────────────
// PRIMITIVES & ENUMS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Valid doubling cube values in backgammon.
 * 1 = no cube, then doubles from 2 through 64.
 */
export const CUBE_VALUES = [1, 2, 4, 8, 16, 32, 64] as const
export type CubeValue = (typeof CUBE_VALUES)[number]

/**
 * Game outcome type.
 * Separates the doubling cube (CubeValue) from the checkers-outcome bonus.
 * NORMAL     = standard win
 * GAMMON     = loser bore off zero checkers (worth 2× base points)
 * BACKGAMMON = loser still had checkers on bar or in winner's home board (3×)
 */
export type GameType = 'NORMAL' | 'GAMMON' | 'BACKGAMMON'

export const GAME_TYPE_MULTIPLIER: Record<GameType, number> = {
  NORMAL:     1,
  GAMMON:     2,
  BACKGAMMON: 3,
}

export const GAME_TYPE_LABEL: Record<GameType, string> = {
  NORMAL:     'Regular win',
  GAMMON:     'Gammon (×2)',
  BACKGAMMON: 'Backgammon (×3)',
}

// ─────────────────────────────────────────────────────────────────────────────
// SESSION / AUTH
// ─────────────────────────────────────────────────────────────────────────────

export type UserRole        = 'ADMIN' | 'TOURNAMENT_MANAGER' | 'PLAYER'
export type TournamentFormat = 'ROUND_ROBIN' | 'SINGLE_ELIMINATION' | 'DOUBLE_ELIMINATION' | 'SWISS'
export type TournamentStatus = 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'ARCHIVED'
export type MemberRole       = 'ORGANIZER' | 'PARTICIPANT'
export type MatchStatus      = 'PENDING' | 'ACTIVE' | 'COMPLETED'
export type OpeningType      = 'RUNNING_GAME' | 'BLITZ' | 'PRIME_VS_PRIME' | 'BACK_GAME' | 'HOLDING_GAME' | 'ANCHOR_GAME' | 'CUSTOM'

export const OPENING_TYPE_LABEL: Record<OpeningType, string> = {
  RUNNING_GAME:   'Running Game',
  BLITZ:          'Blitz',
  PRIME_VS_PRIME: 'Prime vs Prime',
  BACK_GAME:      'Back Game',
  HOLDING_GAME:   'Holding Game',
  ANCHOR_GAME:    'Anchor Game',
  CUSTOM:         'Custom',
}

export const TOURNAMENT_FORMAT_LABEL: Record<TournamentFormat, string> = {
  ROUND_ROBIN:         'Round Robin',
  SINGLE_ELIMINATION:  'Single Elimination',
  DOUBLE_ELIMINATION:  'Double Elimination',
  SWISS:               'Swiss',
}

export const TOURNAMENT_STATUS_LABEL: Record<TournamentStatus, string> = {
  DRAFT:     'Draft',
  ACTIVE:    'Active',
  COMPLETED: 'Completed',
  ARCHIVED:  'Archived',
}

/** Resolved from Supabase session + players table. Stored in cookie/context. */
export interface SessionUser {
  id:          string     // players.id
  supabaseUid: string     // auth.users.id
  email:       string
  name:        string
  role:        UserRole
  avatarUrl?:  string | null
  bio?:        string | null
  isPrivate?:  boolean
}

// ─────────────────────────────────────────────────────────────────────────────
// PLAYER
// ─────────────────────────────────────────────────────────────────────────────

export interface PlayerRow {
  id:          string
  supabaseUid: string
  email:       string
  name:        string
  role:        UserRole
  avatarUrl:   string | null
  createdAt:   Date
  updatedAt:   Date
}

/** Public player shape. Used in leaderboards, game history. */
export interface Player {
  id:        string
  email:     string
  name:      string
  role:      UserRole
  avatarUrl: string | null
}

// ─────────────────────────────────────────────────────────────────────────────
// TOURNAMENT
// ─────────────────────────────────────────────────────────────────────────────

export interface TournamentRow {
  id:           string
  name:         string
  description:  string | null
  location:     string | null
  code:         string
  format:       TournamentFormat
  status:       TournamentStatus
  pointsPerWin: number
  matchLength:  number | null
  maxPlayers:   number | null
  startDate:    Date | null
  createdById:  string
  createdAt:    Date
  updatedAt:    Date
  deletedAt:    Date | null
  archivedAt:   Date | null
}

/** Tournament with member count and current user's membership status. */
export interface Tournament extends TournamentRow {
  memberCount:  number
  isMember:     boolean       // true if the session user is a member
  isOwner:      boolean       // true if the session user created it
  userRole:     MemberRole | null  // null if not a member
}

export interface TournamentWithMembers extends Tournament {
  members: Member[]
}

// ─────────────────────────────────────────────────────────────────────────────
// TOURNAMENT MEMBER
// ─────────────────────────────────────────────────────────────────────────────

export interface MemberRow {
  id:           string      // surrogate PK — always use this for FK references
  tournamentId: string
  playerId:     string | null   // null → guest
  guestName:    string | null   // null → registered player
  memberRole:   MemberRole
  points:       number
  wins:         number
  losses:       number
  joinedAt:     Date
}

/**
 * Resolved member with display name and type discriminator.
 * `name`    = player.name  (registered) OR guestName (guest)
 * `isGuest` = true when playerId is null
 */
export interface Member extends MemberRow {
  name:    string
  isGuest: boolean
}

/** Ranked member — extended with computed rank for standings. */
export interface RankedMember extends Member {
  rank:    number
  winRate: number   // 0–100
}

/** Helper to resolve member display name */
export function getMemberName(member: Pick<MemberRow, 'guestName'> & { player?: { name: string } | null }): string {
  return member.player?.name ?? member.guestName ?? 'Unknown Player'
}

/** Discriminated union for type-safe guest vs registered checks */
export type RegisteredMember = Member & { isGuest: false; playerId: string }
export type GuestMember      = Member & { isGuest: true;  playerId: null; guestName: string }

export function isRegisteredMember(m: Member): m is RegisteredMember {
  return !m.isGuest && m.playerId !== null
}

// ─────────────────────────────────────────────────────────────────────────────
// GAME
// ─────────────────────────────────────────────────────────────────────────────

export interface GameRow {
  id:           string
  tournamentId: string
  winnerId:     string   // → TournamentMember.id
  loserId:      string   // → TournamentMember.id
  multiplier:   number   // cube value: 1 | 2 | 4 | 8 | 16 | 32 | 64
  gameType:     GameType
  points:       number   // cached: pointsPerWin × multiplier × gameTypeMultiplier
  notes:        string | null
  recordedById: string   // → Player.id
  createdAt:    Date
}

/** Game with resolved member names for display. */
export interface Game extends GameRow {
  winnerName:   string
  loserName:    string
  recordedByName: string
}

/** Game as seen from a specific player's perspective. */
export interface PersonalGame extends Game {
  perspective:  'won' | 'lost' | 'other'   // 'other' = neither player is the viewer
  opponent:     string                      // name of the other player (if perspective is won/lost)
  pointsDelta:  number                      // +N if won, -N if lost, 0 if other
}

// ─────────────────────────────────────────────────────────────────────────────
// STATS
// ─────────────────────────────────────────────────────────────────────────────

export interface PlayerStats {
  memberId:       string
  totalGames:     number
  wins:           number
  losses:         number
  winRate:        number        // 0–100
  pointsWon:      number
  pointsLost:     number
  netPoints:      number
  avgCubeValue:   number        // average multiplier across all games
  gammons:        number        // games where gameType === 'GAMMON'
  backgammons:    number        // games where gameType === 'BACKGAMMON'
  streak: {
    current: number
    type:    'win' | 'loss' | null   // null if no games
    best:    number                  // best win streak
  }
}

export interface HeadToHeadStats {
  memberId:     string
  opponentId:   string
  opponentName: string
  wins:         number
  losses:       number
  total:        number
  winRate:      number   // 0–100
  netPoints:    number
}

export interface TournamentStandings {
  tournamentId: string
  members:      RankedMember[]
  updatedAt:    Date
}

// ─────────────────────────────────────────────────────────────────────────────
// SERVER ACTION PAYLOADS (inputs)
// ─────────────────────────────────────────────────────────────────────────────

export interface RegisterPayload {
  phone:   string   // raw input, cleaned server-side
  name:    string
  pin:     string   // 4 digits, hashed server-side before storage
}

export interface LoginPayload {
  phone: string
  pin:   string
}

export interface CreateTournamentPayload {
  name:         string
  description?: string
  location?:    string
  format:       TournamentFormat
  pointsPerWin: number    // 1 | 2 | 5 | 10 | custom
  matchLength?: number
  maxPlayers?:  number
  startDate?:   string    // ISO date string from date input
}

export interface JoinTournamentPayload {
  code: string   // 6-char tournament code
}

export interface DeleteTournamentPayload {
  tournamentId: string
}

export interface ArchiveTournamentPayload {
  tournamentId: string
}

export interface UpdateTournamentStatusPayload {
  tournamentId: string
  status: TournamentStatus
}

export interface UpdateMemberRolePayload {
  memberId: string
  role: MemberRole
}

export interface RemoveMemberPayload {
  memberId:     string
  tournamentId: string
}

export interface RecordGamePayload {
  tournamentId:  string
  winnerId:      string   // TournamentMember.id
  loserId:       string   // TournamentMember.id
  multiplier:    CubeValue
  gameType:      GameType
  notes?:        string
}

export interface AddRegisteredMemberPayload {
  tournamentId: string
  phone:        string
}

export interface AddGuestMemberPayload {
  tournamentId: string
  guestName:    string
}

export interface UpdateMemberStatsPayload {
  memberId: string
  points:   number
  wins:     number
  losses:   number
}

// ─────────────────────────────────────────────────────────────────────────────
// MATCH
// ─────────────────────────────────────────────────────────────────────────────

export interface MatchGameRow {
  id:            string
  matchId:       string
  gameNumber:    number
  winnerId:      string  // TournamentMember.id
  loserId:       string  // TournamentMember.id
  cubeValue:     number
  gameType:      GameType
  pointsAwarded: number
  createdAt:     Date
}

export interface MatchGame extends MatchGameRow {
  winnerName: string
  loserName:  string
}

export interface MatchRow {
  id:           string
  tournamentId: string
  player1Id:    string   // TournamentMember.id
  player2Id:    string   // TournamentMember.id
  targetScore:  number
  player1Score: number
  player2Score: number
  cubeValue:    number
  cubeOwnerId:  string | null
  status:       MatchStatus
  winnerId:     string | null
  openingType:  OpeningType | null
  notes:        string | null
  startedAt:    Date | null
  completedAt:  Date | null
  duration:     number | null
  recordedById: string
  createdAt:    Date
  updatedAt:    Date
}

/** Match with player names and game log. */
export interface Match extends MatchRow {
  player1Name:   string
  player2Name:   string
  winnerName:    string | null
  tournamentName?: string
  games:         MatchGame[]
}

/** Lightweight match for list views. */
export interface MatchSummary extends MatchRow {
  player1Name: string
  player2Name: string
  winnerName:  string | null
  gameCount:   number
}

/** Complete standings row for a tournament member. */
export interface StandingsRow {
  rank:         number
  memberId:     string
  name:         string
  isGuest:      boolean
  wins:         number
  losses:       number
  points:       number
  winRate:      number   // 0–100
  matchDiff:    number   // wins - losses
  totalGames:   number
}

// Match action payloads
export interface CreateMatchPayload {
  tournamentId: string
  player1Id:    string
  player2Id:    string
  targetScore:  number
}

export interface RecordMatchGamePayload {
  matchId:     string
  winnerId:    string   // TournamentMember.id (must be player1Id or player2Id)
  gameType:    GameType
}

export interface AcceptDoublePayload {
  matchId:      string
  acceptorId:   string  // TournamentMember.id of who accepted (they now own cube)
}

export interface DeclineDoublePayload {
  matchId:     string
  offererId:   string  // TournamentMember.id of who offered (they win the game)
}

export interface CompleteMatchPayload {
  matchId:     string
  openingType?: OpeningType
  notes?:      string
}

// ─────────────────────────────────────────────────────────────────────────────
// SERVER ACTION RESULTS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Standard result shape for Server Actions.
 * Components use the discriminated union to handle success/error states.
 */
export type ActionResult<T = void> =
  | { success: true;  data: T }
  | { success: false; error: string }

// ─────────────────────────────────────────────────────────────────────────────
// UI STATE
// ─────────────────────────────────────────────────────────────────────────────

/** The four tabs in the tournament dashboard. */
export type DashboardTab = 'home' | 'standings' | 'head-to-head' | 'analytics'

/** Step IDs for the record-game wizard. */
export type RecordGameStep = 'opponent' | 'result' | 'multiplier' | 'game-type' | 'notes'
