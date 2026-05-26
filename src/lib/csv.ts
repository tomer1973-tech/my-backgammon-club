/**
 * CSV generation utilities.
 *
 * Stateless pure functions — no DB or server imports.
 * Each function accepts pre-fetched data and returns a CSV string.
 */

/** Escape a single cell value per RFC 4180. */
function cell(value: string | number | null | undefined): string {
  const s = String(value ?? '')
  // Wrap in quotes if the value contains commas, quotes, or newlines
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

/** Build a single CSV row from an array of values. */
function row(cols: (string | number | null | undefined)[]): string {
  return cols.map(cell).join(',')
}

/** Build a full CSV string from headers + data rows. */
export function buildCsv(
  headers: string[],
  rows: (string | number | null | undefined)[][],
): string {
  return [row(headers), ...rows.map(row)].join('\r\n')
}

// ─────────────────────────────────────────────────────────────────────────────
// STANDINGS CSV
// ─────────────────────────────────────────────────────────────────────────────

export interface CsvStandingsRow {
  rank:      number
  name:      string
  isGuest:   boolean
  wins:      number
  losses:    number
  points:    number
  winRate:   number
  matchDiff: number
}

export function buildStandingsCsv(standings: CsvStandingsRow[], tournamentName: string): string {
  const headers = ['Rank', 'Player', 'Type', 'Wins', 'Losses', 'W-L Diff', 'Points', 'Win Rate']
  const rows = standings.map(s => [
    s.rank,
    s.name,
    s.isGuest ? 'Guest' : 'Registered',
    s.wins,
    s.losses,
    s.matchDiff,
    s.points,
    `${s.winRate}%`,
  ])
  return `# ${tournamentName} — Standings\r\n` + buildCsv(headers, rows)
}

// ─────────────────────────────────────────────────────────────────────────────
// MATCH HISTORY CSV
// ─────────────────────────────────────────────────────────────────────────────

export interface CsvMatchRow {
  id:          string
  date:        Date
  player1Name: string
  player2Name: string
  player1Score: number
  player2Score: number
  targetScore: number
  winnerName:  string | null
  status:      string
  openingType: string | null
  duration:    number | null   // seconds
}

export function buildMatchesCsv(matches: CsvMatchRow[], tournamentName: string): string {
  const headers = [
    'Date', 'Player 1', 'Player 2', 'Score', 'Target', 'Winner',
    'Status', 'Opening', 'Duration (min)',
  ]
  const rows = matches.map(m => [
    m.date.toLocaleDateString('en-US'),
    m.player1Name,
    m.player2Name,
    `${m.player1Score}-${m.player2Score}`,
    m.targetScore,
    m.winnerName ?? '',
    m.status,
    m.openingType ?? '',
    m.duration ? Math.round(m.duration / 60) : '',
  ])
  return `# ${tournamentName} — Match History\r\n` + buildCsv(headers, rows)
}

// ─────────────────────────────────────────────────────────────────────────────
// PLAYER STATS CSV
// ─────────────────────────────────────────────────────────────────────────────

export interface CsvPlayerRow {
  name:           string
  isGuest:        boolean
  wins:           number
  losses:         number
  winRate:        number
  points:         number
  totalGames:     number
  cubeUsageRate:  number
  gammonRate:     number
  currentStreak:  number
  streakType:     'win' | 'loss' | null
  bestWinStreak:  number
}

export function buildPlayersCsv(players: CsvPlayerRow[], tournamentName: string): string {
  const headers = [
    'Player', 'Type', 'Wins', 'Losses', 'Win Rate', 'Points',
    'Games Played', 'Cube Usage %', 'Gammon Rate %',
    'Current Streak', 'Best Win Streak',
  ]
  const rows = players.map(p => [
    p.name,
    p.isGuest ? 'Guest' : 'Registered',
    p.wins,
    p.losses,
    `${p.winRate}%`,
    p.points,
    p.totalGames,
    `${p.cubeUsageRate}%`,
    `${p.gammonRate}%`,
    p.currentStreak > 0 ? `${p.currentStreak} ${p.streakType ?? ''}` : '0',
    p.bestWinStreak,
  ])
  return `# ${tournamentName} — Player Statistics\r\n` + buildCsv(headers, rows)
}
