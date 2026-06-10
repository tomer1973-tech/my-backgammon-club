'use client'

/**
 * QuickGameClient — instant backgammon scorer.
 *
 * ─── Entry paths ─────────────────────────────────────────────────────────
 *
 * 1. Via Quick Match dialog (lobby):
 *    Lobby writes roster + race-to to localStorage → navigates to /quick-game.
 *    On mount we read both keys and jump DIRECTLY to the live scoreboard.
 *    No roster screen, no setup screen, no P1/P2 selection.
 *
 * 2. Direct navigation to /quick-game:
 *    Shows "Add players" + race-to selector.
 *    Start becomes available as soon as ≥ 2 players are added.
 *
 * ─── Stats recording ─────────────────────────────────────────────────────
 *
 * When a match completes, the component auto-calls saveQuickGameResult for
 * any player whose ID is a real DB UUID (registered account).
 *   • Guest IDs ('guest:…')  → skipped silently
 *   • Local temp IDs ('local:…') → skipped silently
 *   • Registered UUIDs       → quickWins / quickLosses incremented
 *
 * If the caller is not signed in, the server action returns
 * { success: false, error: 'not-signed-in' } and we show a sign-in CTA
 * instead.
 */

import { useState, useEffect, useRef }   from 'react'
import Link                               from 'next/link'
import {
  UserPlus, X, Trophy, RotateCcw, RefreshCcw,
  Zap, CheckCircle2, ChevronDown, ChevronUp, ChevronLeft,
  Users, LogIn, Save, UserCircle2,
} from 'lucide-react'
import { Avatar }   from '@/components/ui/avatar'
import { Button }   from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { cn }       from '@/lib/utils'
import { saveQuickGameResult } from '@/actions/quick-match'
import type { SessionUser } from '@/types'

// ─── Types ────────────────────────────────────────────────────────────────────

interface QPlayer   { id: string; name: string }
type GameType     = 'NORMAL' | 'GAMMON' | 'BACKGAMMON'
type Phase        = 'roster' | 'playing' | 'complete'
type SaveStatus   = 'idle' | 'saving' | 'saved' | 'not-needed' | 'login-required'

interface GameRecord { winnerId: string; type: GameType; pts: number }

interface LiveMatch {
  /** First player */
  a:        QPlayer
  /** Second player */
  b:        QPlayer
  target:   number
  scoreA:   number
  scoreB:   number
  games:    GameRecord[]
  /** null while match is in progress */
  winnerId: string | null
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MULT:  Record<GameType, number> = { NORMAL: 1, GAMMON: 2, BACKGAMMON: 3 }
const LABEL: Record<GameType, string> = { NORMAL: 'Normal', GAMMON: 'Gammon', BACKGAMMON: 'Backgammon' }
const GTYPES: GameType[]              = ['NORMAL', 'GAMMON', 'BACKGAMMON']
const RACE_OPTIONS                    = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15]

const LS_ROSTER  = 'qg_roster_v1'
const LS_RACE_TO = 'qg_race_to_v1'

/** UUID shape = a registered player DB record.  Used to decide whether to save stats. */
const isUUID = (id: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)

/** Generate a local (non-DB) player ID for roster-phase additions. */
function uid() { return 'local:' + Math.random().toString(36).slice(2, 10) }

// ─── Root ─────────────────────────────────────────────────────────────────────

export function QuickGameClient({ currentUser }: { currentUser: SessionUser | null }) {
  const [roster,   setRoster]   = useState<QPlayer[]>([])
  const [phase,    setPhase]    = useState<Phase>('roster')
  const [match,    setMatch]    = useState<LiveMatch | null>(null)
  const [hydrated, setHydrated] = useState(false)

  // ── Load from localStorage on mount ───────────────────────────────────
  useEffect(() => {
    let players: QPlayer[]    = []
    let preRace: number | null = null

    try {
      const r = localStorage.getItem(LS_ROSTER)
      if (r) players = JSON.parse(r)
    } catch {}

    try {
      const rt = localStorage.getItem(LS_RACE_TO)
      if (rt) {
        const n = parseInt(rt, 10)
        if (!isNaN(n)) preRace = n
        // Consume race-to so a manual re-visit starts fresh
        localStorage.removeItem(LS_RACE_TO)
      }
    } catch {}

    setRoster(players)

    // Pre-configured via dialog: skip setup, go straight to scoring
    if (players.length >= 2 && preRace !== null) {
      setMatch({
        a: players[0], b: players[1],
        target: preRace,
        scoreA: 0, scoreB: 0,
        games: [], winnerId: null,
      })
      setPhase('playing')
    }

    setHydrated(true)
  }, [])

  // ── Persist roster for direct-navigation mode ──────────────────────────
  useEffect(() => {
    if (!hydrated) return
    try { localStorage.setItem(LS_ROSTER, JSON.stringify(roster)) } catch {}
  }, [roster, hydrated])

  // ── Match actions ──────────────────────────────────────────────────────

  function startMatch(a: QPlayer, b: QPlayer, target: number) {
    setMatch({ a, b, target, scoreA: 0, scoreB: 0, games: [], winnerId: null })
    setPhase('playing')
  }

  function recordGame(winnerId: string, type: GameType) {
    if (!match || match.winnerId) return
    const pts    = MULT[type]
    const isAWin = winnerId === match.a.id
    const scoreA = match.scoreA + (isAWin ? pts : 0)
    const scoreB = match.scoreB + (isAWin ? 0  : pts)
    const done   = scoreA >= match.target || scoreB >= match.target
    const updated = {
      ...match, scoreA, scoreB,
      games:    [...match.games, { winnerId, type, pts }],
      winnerId: done ? winnerId : null,
    }
    setMatch(updated)
    if (done) setPhase('complete')
  }

  function rematch() {
    if (!match) return
    setMatch({ ...match, scoreA: 0, scoreB: 0, games: [], winnerId: null })
    setPhase('playing')
  }

  function newGame() {
    setMatch(null)
    setPhase('roster')
    try { localStorage.removeItem(LS_ROSTER) } catch {}
    setRoster([])
  }

  // ── Render ─────────────────────────────────────────────────────────────

  if (!hydrated) return null

  return (
    <div className="animate-fade-in">

      {/* ── Top bar: back link + sign-in status ── */}
      <div className="mb-4 flex items-center justify-between gap-3">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 -ml-2
            text-sm font-medium text-ink-muted hover:text-ink hover:bg-surface-raised transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          Dashboard
        </Link>

        {currentUser ? (
          <Link
            href="/settings"
            className="inline-flex items-center gap-2 rounded-full border border-line
              bg-surface-raised pl-1.5 pr-3 py-1 hover:border-gold/30 transition-colors"
          >
            <Avatar name={currentUser.name} src={currentUser.avatarUrl} size="sm" />
            <span className="text-xs font-medium text-ink-muted">
              Signed in as <span className="font-semibold text-ink">{currentUser.name.split(' ')[0]}</span>
            </span>
          </Link>
        ) : (
          <div className="inline-flex items-center gap-1.5 rounded-full border border-line
            bg-surface-raised px-3 py-1.5 text-xs">
            <UserCircle2 className="h-3.5 w-3.5 text-ink-subtle" />
            <span className="text-ink-subtle">Not signed in ·</span>
            <Link href="/login?returnTo=/quick-game" className="font-semibold text-gold hover:text-gold/80 transition-colors">
              Sign in
            </Link>
            <span className="text-ink-subtle">/</span>
            <Link href="/register" className="font-semibold text-gold hover:text-gold/80 transition-colors">
              Create account
            </Link>
          </div>
        )}
      </div>

      {/* ── Page header ── */}
      <div className="mb-8 text-center">
        <div className="mb-3 inline-flex h-16 w-16 items-center justify-center
          rounded-2xl bg-surface-raised border border-line shadow-gold text-4xl">
          🎲
        </div>
        <h1 className="font-display text-3xl font-bold text-ink tracking-tight">
          Quick Game
        </h1>
        <p className="mt-1.5 text-sm text-ink-muted">
          {phase === 'roster'   && 'Add players and pick a race length'}
          {phase === 'playing'  && 'Tap the winner after each game'}
          {phase === 'complete' && 'Match complete!'}
        </p>
      </div>

      {/* ── Phases ── */}
      {phase === 'roster' && (
        <RosterSetup
          roster={roster}
          onAdd={name => {
            const t = name.trim()
            if (!t || roster.some(p => p.name.toLowerCase() === t.toLowerCase())) return
            setRoster(prev => [...prev, { id: uid(), name: t }])
          }}
          onRemove={id => setRoster(prev => prev.filter(p => p.id !== id))}
          onStart={startMatch}
        />
      )}

      {phase === 'playing' && match && (
        <PlayingPhase match={match} onRecord={recordGame} />
      )}

      {phase === 'complete' && match && (
        <CompletePhase match={match} onRematch={rematch} onNewGame={newGame} />
      )}

    </div>
  )
}

// ─── Roster + Setup phase ─────────────────────────────────────────────────────
//
// For direct-navigation: one unified screen — add players at top,
// VS preview + race-to + Start appear automatically once ≥ 2 players are added.
// For 3+ players the user taps two to select the matchup.

function RosterSetup({
  roster, onAdd, onRemove, onStart,
}: {
  roster:   QPlayer[]
  onAdd:    (name: string) => void
  onRemove: (id: string) => void
  onStart:  (a: QPlayer, b: QPlayer, target: number) => void
}) {
  const [input,  setInput]  = useState('')
  const [raceTo, setRaceTo] = useState(7)
  const [sel,    setSel]    = useState<{ a: string | null; b: string | null }>({ a: null, b: null })
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-select when exactly 2 players; clear when fewer; keep for 3+
  useEffect(() => {
    if (roster.length === 2) {
      setSel({ a: roster[0].id, b: roster[1].id })
    } else if (roster.length < 2) {
      setSel({ a: null, b: null })
    } else {
      // 3+ players: clear any stale selection for removed players
      const ids = new Set(roster.map(p => p.id))
      setSel(prev => ({
        a: prev.a && ids.has(prev.a) ? prev.a : null,
        b: prev.b && ids.has(prev.b) ? prev.b : null,
      }))
    }
  }, [roster])

  function tap(id: string) {
    setSel(prev => {
      if (prev.a === id) return { a: prev.b, b: null }  // was A → deselect, promote B
      if (prev.b === id) return { ...prev, b: null }     // was B → deselect
      if (!prev.a)       return { ...prev, a: id }       // A empty → assign A
      if (!prev.b)       return { ...prev, b: id }       // B empty → assign B
      return { ...prev, b: id }                          // both full → replace B
    })
  }

  function handleAdd() {
    const name = input.trim()
    if (!name) return
    onAdd(name)
    setInput('')
    inputRef.current?.focus()
  }

  const playerA = roster.find(p => p.id === sel.a)
  const playerB = roster.find(p => p.id === sel.b)
  const ready   = !!(playerA && playerB)
  const needsPick = roster.length > 2

  return (
    <div className="space-y-4">

      {/* ── Add player ── */}
      <div className="rounded-2xl border border-line bg-surface-raised p-5 space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-ink-subtle flex items-center gap-2">
          <UserPlus className="h-3.5 w-3.5" /> Players
        </p>

        <div className="flex gap-2">
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            placeholder="Player name…"
            maxLength={40}
            autoFocus
            className={cn(
              'flex-1 rounded-lg border border-line bg-surface-elevated',
              'px-3 py-2.5 text-sm text-ink placeholder:text-ink-subtle',
              'focus:outline-none focus:ring-2 focus:ring-gold/60 focus:border-gold/60 transition-colors',
            )}
          />
          <Button onClick={handleAdd} disabled={!input.trim()} variant="secondary" className="shrink-0">
            Add
          </Button>
        </div>

        {roster.length === 0 && (
          <p className="py-2 text-center text-sm text-ink-subtle">Add at least 2 players to start</p>
        )}

        {roster.length > 0 && (
          <ul className="space-y-1.5">
            {roster.map(p => {
              const isA = p.id === sel.a
              const isB = p.id === sel.b
              return (
                <li
                  key={p.id}
                  onClick={needsPick ? () => tap(p.id) : undefined}
                  className={cn(
                    'flex items-center gap-2.5 rounded-xl border px-3 py-2.5 transition-all',
                    needsPick && 'cursor-pointer',
                    isA ? 'border-gold/50 bg-gold/8' :
                    isB ? 'border-win/50 bg-win/8'   :
                    'border-line bg-surface-elevated',
                    needsPick && !isA && !isB && 'hover:border-gold/30',
                  )}
                >
                  <Avatar name={p.name} size="sm" />
                  <span className="flex-1 truncate text-sm font-medium text-ink">{p.name}</span>

                  {/* Selection badge (3+ players only) */}
                  {needsPick && (
                    <span className={cn(
                      'shrink-0 w-5 text-right text-[10px] font-bold',
                      isA ? 'text-gold' : isB ? 'text-win' : 'text-ink-subtle/40',
                    )}>
                      {isA ? 'A' : isB ? 'B' : '–'}
                    </span>
                  )}

                  <button
                    onClick={e => { e.stopPropagation(); onRemove(p.id) }}
                    className="shrink-0 text-ink-subtle hover:text-loss transition-colors"
                    aria-label={`Remove ${p.name}`}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </li>
              )
            })}
          </ul>
        )}

        {needsPick && !ready && (
          <p className="text-center text-xs text-ink-subtle">
            Tap two players to select for this match
          </p>
        )}
      </div>

      {/* ── VS preview + race-to + Start (shown once two players are selected) ── */}
      {ready && (
        <div className="rounded-2xl border border-gold/30 bg-surface-raised p-5 space-y-5">

          {/* VS preview */}
          <div className="flex items-center gap-4">
            <div className="flex-1 text-center min-w-0">
              <Avatar name={playerA!.name} size="md" className="mx-auto" />
              <p className="mt-1.5 text-sm font-semibold text-ink truncate px-1">{playerA!.name}</p>
            </div>
            <div className="shrink-0">
              <span className="text-2xl font-black text-ink-subtle/50">vs</span>
            </div>
            <div className="flex-1 text-center min-w-0">
              <Avatar name={playerB!.name} size="md" className="mx-auto" />
              <p className="mt-1.5 text-sm font-semibold text-ink truncate px-1">{playerB!.name}</p>
            </div>
          </div>

          {/* Race to selector */}
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-ink-muted text-center mb-2.5">
              Race to
            </p>
            <div className="grid grid-cols-5 sm:grid-cols-8 gap-1.5">
              {RACE_OPTIONS.map(n => (
                <button
                  key={n}
                  onClick={() => setRaceTo(n)}
                  className={cn(
                    'rounded-lg border py-2 text-sm font-bold transition-all',
                    raceTo === n
                      ? 'border-gold/60 bg-gold/15 text-gold shadow-[0_0_12px_hsl(var(--gold)/0.2)]'
                      : 'border-line bg-surface-elevated text-ink-muted hover:border-gold/30 hover:text-ink',
                  )}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          <Button
            onClick={() => onStart(playerA!, playerB!, raceTo)}
            size="lg"
            className="w-full gap-2"
          >
            <Zap className="h-5 w-5" />
            Start — {playerA!.name} vs {playerB!.name} · Race to {raceTo}
          </Button>
        </div>
      )}

    </div>
  )
}

// ─── Playing phase ────────────────────────────────────────────────────────────

function PlayingPhase({
  match, onRecord,
}: {
  match:    LiveMatch
  onRecord: (winnerId: string, type: GameType) => void
}) {
  const [winner,   setWinner]   = useState<string | null>(null)
  const [gameType, setGameType] = useState<GameType>('NORMAL')

  const pts = MULT[gameType]

  function confirm() {
    if (!winner) return
    onRecord(winner, gameType)
    setWinner(null)
    setGameType('NORMAL')
  }

  return (
    <div className="space-y-4">

      {/* Scoreboard */}
      <ScoreBoard match={match} />

      {/* Record a game */}
      <div className="rounded-xl border border-line bg-surface-raised p-5 space-y-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-subtle">
          Record a game
        </h3>

        {/* Who won? */}
        <div>
          <p className="text-xs text-ink-muted mb-2">Who won this game?</p>
          <div className="grid grid-cols-2 gap-3">
            {[match.a, match.b].map(p => (
              <button
                key={p.id}
                onClick={() => setWinner(p.id)}
                className={cn(
                  'rounded-xl border-2 px-3 py-4 text-sm font-semibold',
                  'transition-all duration-150 active:scale-[0.97]',
                  winner === p.id
                    ? 'border-gold bg-gold/15 text-gold shadow-gold'
                    : 'border-line bg-surface-elevated text-ink-muted hover:border-gold/40 hover:text-ink',
                )}
              >
                <span className="block truncate">{p.name}</span>
                {winner === p.id && <CheckCircle2 className="mx-auto mt-1 h-4 w-4 text-gold" />}
              </button>
            ))}
          </div>
        </div>

        {/* Win type */}
        <div>
          <p className="text-xs text-ink-muted mb-2">Win type</p>
          <div className="grid grid-cols-3 gap-2">
            {GTYPES.map(t => (
              <button
                key={t}
                onClick={() => setGameType(t)}
                className={cn(
                  'rounded-lg border px-2 py-2 text-xs font-medium transition-all',
                  gameType === t
                    ? 'border-gold bg-gold/10 text-gold'
                    : 'border-line bg-surface-elevated text-ink-muted hover:border-gold/40',
                )}
              >
                <span className="block">{LABEL[t]}</span>
                <span className="block text-[10px] opacity-70">×{MULT[t]}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Points preview */}
        {winner && (
          <div className="rounded-lg border border-gold/20 bg-gold/5 px-3 py-2.5 text-center">
            <p className="text-xs text-ink-muted">Points awarded</p>
            <p className="text-xl font-bold text-gold">+{pts}</p>
          </div>
        )}

        <Button onClick={confirm} disabled={!winner} className="w-full gap-2">
          <CheckCircle2 className="h-4 w-4" />
          Confirm game
        </Button>
      </div>

      {/* Game log */}
      {match.games.length > 0 && <GameLog match={match} initialExpanded />}

    </div>
  )
}

// ─── Complete phase ───────────────────────────────────────────────────────────

function CompletePhase({
  match, onRematch, onNewGame,
}: {
  match:      LiveMatch
  onRematch:  () => void
  onNewGame:  () => void
}) {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')

  const winnerId   = match.winnerId!
  const winner     = winnerId === match.a.id ? match.a  : match.b
  const loser      = winnerId === match.a.id ? match.b  : match.a
  const winnerScore = winnerId === match.a.id ? match.scoreA : match.scoreB
  const loserScore  = winnerId === match.a.id ? match.scoreB : match.scoreA

  // Auto-save stats when the complete screen mounts
  useEffect(() => {
    const loserId = winnerId === match.a.id ? match.b.id : match.a.id

    // Skip if neither player is a registered account
    if (!isUUID(winnerId) && !isUUID(loserId)) {
      setSaveStatus('not-needed')
      return
    }

    setSaveStatus('saving')
    saveQuickGameResult(winnerId, loserId).then(res => {
      if (res.success) {
        setSaveStatus(res.data.savedCount > 0 ? 'saved' : 'not-needed')
      } else if (res.error === 'not-signed-in') {
        setSaveStatus('login-required')
      } else {
        setSaveStatus('not-needed')
      }
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="space-y-4 animate-fade-in">

      {/* Winner card */}
      <div className="rounded-2xl border border-win/40 bg-win/5 p-8 text-center space-y-3">
        <Trophy className="mx-auto h-12 w-12 text-win" />

        <div>
          <p className="text-xs uppercase tracking-widest text-ink-subtle mb-1">Winner</p>
          <h2 className="text-3xl font-black text-win">{winner.name}</h2>
          <p className="mt-2 text-sm text-ink-muted">
            {winnerScore} – {loserScore} over {loser.name} · Race to {match.target}
          </p>
        </div>

        {/* Save status badge */}
        {saveStatus === 'saving' && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-line
            bg-surface-elevated px-3 py-1 text-xs font-medium text-ink-subtle animate-pulse">
            Saving stats…
          </span>
        )}
        {saveStatus === 'saved' && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-win/30
            bg-win/10 px-3 py-1 text-xs font-medium text-win">
            <Save className="h-3 w-3" />
            Stats saved to player profiles
          </span>
        )}
        {saveStatus === 'login-required' && (
          <Link
            href="/login?returnTo=/quick-game"
            className="inline-flex items-center gap-1.5 rounded-full border border-gold/30
              bg-gold/10 px-3 py-1.5 text-xs font-medium text-gold
              hover:bg-gold/20 transition-colors"
          >
            <LogIn className="h-3 w-3" />
            Sign in to save your stats
          </Link>
        )}
      </div>

      {/* Final scoreboard */}
      <ScoreBoard match={match} />

      {/* Game log */}
      {match.games.length > 0 && <GameLog match={match} />}

      {/* Actions */}
      <div className="grid grid-cols-2 gap-3">
        <Button onClick={onRematch} variant="secondary" className="gap-2">
          <RotateCcw className="h-4 w-4" />
          Rematch
        </Button>
        <Button onClick={onNewGame} variant="secondary" className="gap-2">
          <RefreshCcw className="h-4 w-4" />
          New game
        </Button>
      </div>

    </div>
  )
}

// ─── ScoreBoard ───────────────────────────────────────────────────────────────

function ScoreBoard({ match }: { match: LiveMatch }) {
  const aWon   = match.winnerId === match.a.id
  const bWon   = match.winnerId === match.b.id
  const isOver = !!match.winnerId

  return (
    <div className="rounded-2xl border border-line bg-surface-raised p-6">

      {/* Big score numbers */}
      <div className="flex items-stretch gap-4">
        <PlayerScore
          name={match.a.name}
          score={match.scoreA}
          align="left"
          won={aWon}
          lost={isOver && !aWon}
          leading={!isOver && match.scoreA > match.scoreB}
        />
        <div className="flex flex-col items-center justify-center gap-1 shrink-0">
          <div className="h-10 w-px bg-line/60" />
          <span className="text-xs font-semibold uppercase tracking-widest text-ink-subtle">vs</span>
          <div className="h-10 w-px bg-line/60" />
        </div>
        <PlayerScore
          name={match.b.name}
          score={match.scoreB}
          align="right"
          won={bWon}
          lost={isOver && !bWon}
          leading={!isOver && match.scoreB > match.scoreA}
        />
      </div>

      {/* Race-to label */}
      <div className="mt-4 flex items-center justify-center gap-2">
        <div className="h-px flex-1 bg-line/40" />
        <span className="text-xs font-medium text-ink-subtle">
          Race to {match.target} {match.target === 1 ? 'point' : 'points'}
        </span>
        <div className="h-px flex-1 bg-line/40" />
      </div>

      {/* Progress bars */}
      <div className="mt-3 space-y-2">
        {[
          { player: match.a, score: match.scoreA, won: aWon },
          { player: match.b, score: match.scoreB, won: bWon },
        ].map(({ player, score, won }) => (
          <div key={player.id} className="flex items-center gap-3">
            <span className="w-16 shrink-0 truncate text-right text-xs text-ink-subtle">
              {player.name.split(' ')[0]}
            </span>
            <Progress value={score} max={match.target} variant={won ? 'win' : 'gold'} className="flex-1" />
            <span className="w-10 shrink-0 text-xs font-semibold text-ink">
              {score}/{match.target}
            </span>
          </div>
        ))}
      </div>

      {/* Winner banner */}
      {isOver && (
        <div className="mt-4 flex items-center justify-center rounded-xl
          border border-win/30 bg-win/10 px-4 py-2">
          <span className="text-sm font-semibold text-win">
            {aWon ? match.a.name : match.b.name} wins the match!
          </span>
        </div>
      )}

    </div>
  )
}

function PlayerScore({
  name, score, align, won, lost, leading,
}: {
  name:     string
  score:    number
  align:    'left' | 'right'
  won?:     boolean
  lost?:    boolean
  leading?: boolean
}) {
  return (
    <div className={cn('flex flex-1 flex-col gap-1', align === 'right' && 'items-end')}>
      <span className={cn(
        'truncate text-sm font-medium transition-colors',
        won ? 'text-win' : lost ? 'text-ink-subtle' : leading ? 'text-gold' : 'text-ink-muted',
      )}>
        {name}
      </span>
      <span className={cn(
        'font-mono text-5xl font-black leading-none tabular-nums',
        won ? 'text-win' : lost ? 'text-ink-subtle' : leading ? 'text-gold' : 'text-ink',
      )}>
        {score}
      </span>
      {won && <span className="text-xs font-semibold text-win">Winner</span>}
    </div>
  )
}

// ─── Game log ─────────────────────────────────────────────────────────────────

function GameLog({ match, initialExpanded = false }: { match: LiveMatch; initialExpanded?: boolean }) {
  const [expanded, setExpanded] = useState(initialExpanded)

  return (
    <div className="rounded-xl border border-line bg-surface-raised overflow-hidden">
      <button
        onClick={() => setExpanded(e => !e)}
        className="flex w-full items-center justify-between px-4 py-3
          text-xs font-semibold uppercase tracking-wider text-ink-subtle
          hover:text-ink transition-colors"
      >
        <span>Game log · {match.games.length} game{match.games.length !== 1 ? 's' : ''}</span>
        {expanded
          ? <ChevronUp   className="h-3.5 w-3.5" />
          : <ChevronDown className="h-3.5 w-3.5" />}
      </button>

      {expanded && (
        <ol className="border-t border-line divide-y divide-line/50">
          {match.games.map((g, i) => {
            const scorer = g.winnerId === match.a.id ? match.a.name : match.b.name
            return (
              <li key={i} className="flex items-center gap-2 px-4 py-2.5 text-xs text-ink-muted">
                <span className="w-4 shrink-0 text-right text-ink-subtle">{i + 1}.</span>
                <span className="font-medium text-ink">{scorer}</span>
                <span>· {LABEL[g.type]}</span>
                <span className="ml-auto font-semibold text-gold">+{g.pts}</span>
              </li>
            )
          })}
        </ol>
      )}
    </div>
  )
}
