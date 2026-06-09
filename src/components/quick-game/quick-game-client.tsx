'use client'

/**
 * QuickGameClient — no sign-in required backgammon scorer.
 *
 * Phases:
 *   roster  → add / manage players (saved to localStorage)
 *   setup   → pick 2 players + match length
 *   playing → live score tracking
 *   complete → winner + rematch / new pairing / back to roster
 */

import { useState, useEffect, useRef, KeyboardEvent } from 'react'
import Link         from 'next/link'
import { UserPlus, X, Trophy, RefreshCcw, Users, Target,
         CheckCircle2, ChevronLeft, Zap, RotateCcw }  from 'lucide-react'
import { Avatar }   from '@/components/ui/avatar'
import { Button }   from '@/components/ui/button'
import { Input }    from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { cn }       from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Player { id: string; name: string }

type GameType   = 'NORMAL' | 'GAMMON' | 'BACKGAMMON'
type Phase      = 'roster' | 'setup' | 'playing' | 'complete'

interface GameRecord { winnerId: string; type: GameType; points: number }

interface ActiveMatch {
  p1:          Player
  p2:          Player
  target:      number
  p1Score:     number
  p2Score:     number
  games:       GameRecord[]
  winnerId:    string | null
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MULTIPLIER: Record<GameType, number> = { NORMAL: 1, GAMMON: 2, BACKGAMMON: 3 }
const TYPE_LABEL: Record<GameType, string> = {
  NORMAL:     'Normal',
  GAMMON:     'Gammon',
  BACKGAMMON: 'Backgammon',
}
const GAME_TYPES: GameType[] = ['NORMAL', 'GAMMON', 'BACKGAMMON']

const TARGET_OPTIONS = [
  { v: 1,  l: '1 pt'   },
  { v: 2,  l: '2 pts'  },
  { v: 3,  l: '3 pts'  },
  { v: 4,  l: '4 pts'  },
  { v: 5,  l: '5 pts'  },
  { v: 6,  l: '6 pts'  },
  { v: 7,  l: '7 pts'  },
  { v: 8,  l: '8 pts'  },
  { v: 9,  l: '9 pts'  },
  { v: 10, l: '10 pts' },
  { v: 11, l: '11 pts' },
  { v: 12, l: '12 pts' },
  { v: 13, l: '13 pts' },
  { v: 14, l: '14 pts' },
  { v: 15, l: '15 pts' },
]

const LS_KEY        = 'qg_roster_v1'
const LS_RACE_TO    = 'qg_race_to_v1'

function uid() { return Math.random().toString(36).slice(2, 10) }

// ─── Root ─────────────────────────────────────────────────────────────────────

export function QuickGameClient() {
  const [roster,       setRoster]      = useState<Player[]>([])
  const [phase,        setPhase]       = useState<Phase>('roster')
  const [match,        setMatch]       = useState<ActiveMatch | null>(null)
  const [hydrated,     setHydrated]    = useState(false)
  const [defaultRaceTo, setDefaultRaceTo] = useState(7)

  // Load roster (and optional race-to pref) from localStorage once on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LS_KEY)
      if (saved) {
        const players: Player[] = JSON.parse(saved)
        setRoster(players)
        // If we arrived with a pre-built roster (≥2 players), jump to setup
        if (players.length >= 2) setPhase('setup')
      }
    } catch {}
    try {
      const savedRaceTo = localStorage.getItem(LS_RACE_TO)
      if (savedRaceTo) {
        const n = parseInt(savedRaceTo, 10)
        if (!isNaN(n)) setDefaultRaceTo(n)
        // Consume it so the next manual visit starts fresh
        localStorage.removeItem(LS_RACE_TO)
      }
    } catch {}
    setHydrated(true)
  }, [])

  // Persist roster on every change
  useEffect(() => {
    if (!hydrated) return
    try { localStorage.setItem(LS_KEY, JSON.stringify(roster)) } catch {}
  }, [roster, hydrated])

  function addPlayer(name: string) {
    const trimmed = name.trim()
    if (!trimmed) return
    if (roster.some(p => p.name.toLowerCase() === trimmed.toLowerCase())) return
    setRoster(prev => [...prev, { id: uid(), name: trimmed }])
  }

  function removePlayer(id: string) {
    setRoster(prev => prev.filter(p => p.id !== id))
  }

  function startMatch(p1: Player, p2: Player, target: number) {
    setMatch({ p1, p2, target, p1Score: 0, p2Score: 0, games: [], winnerId: null })
    setPhase('playing')
  }

  function recordGame(winnerId: string, type: GameType) {
    if (!match || match.winnerId) return
    const points  = MULTIPLIER[type]
    const isP1Win = winnerId === match.p1.id

    const newP1 = match.p1Score + (isP1Win ? points : 0)
    const newP2 = match.p2Score + (isP1Win ? 0 : points)
    const done  = newP1 >= match.target || newP2 >= match.target
    const w     = done ? winnerId : null

    const updated: ActiveMatch = {
      ...match,
      p1Score:  newP1,
      p2Score:  newP2,
      games:    [...match.games, { winnerId, type, points }],
      winnerId: w,
    }
    setMatch(updated)
    if (done) setPhase('complete')
  }

  function rematch() {
    if (!match) return
    setMatch({ ...match, p1Score: 0, p2Score: 0, games: [], winnerId: null })
    setPhase('playing')
  }

  function newPairing() {
    setMatch(null)
    setPhase('setup')
  }

  function backToRoster() {
    setMatch(null)
    setPhase('roster')
  }

  if (!hydrated) return null   // avoid SSR mismatch

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="mb-8 text-center">
        <div className="mb-3 inline-flex h-16 w-16 items-center justify-center rounded-2xl
          bg-surface-raised border border-line-gold/50 shadow-gold text-4xl">
          🎲
        </div>
        <h1 className="font-display text-3xl font-bold text-ink tracking-tight">
          Quick Game
        </h1>
        <p className="mt-1.5 text-sm text-ink-muted">
          {phase === 'roster'   && 'Add players — no account needed'}
          {phase === 'setup'    && 'Pick two players and a match length'}
          {phase === 'playing'  && 'Recording live — tap who won each game'}
          {phase === 'complete' && 'Match complete!'}
        </p>
      </div>

      {/* Phase screens */}
      {phase === 'roster'   && (
        <RosterPhase
          roster={roster}
          onAdd={addPlayer}
          onRemove={removePlayer}
          onNext={() => setPhase('setup')}
        />
      )}
      {phase === 'setup'    && (
        <SetupPhase
          roster={roster}
          defaultTarget={defaultRaceTo}
          onStart={startMatch}
          onBack={() => setPhase('roster')}
        />
      )}
      {phase === 'playing'  && match && (
        <PlayingPhase
          match={match}
          onRecord={recordGame}
        />
      )}
      {phase === 'complete' && match && (
        <CompletePhase
          match={match}
          onRematch={rematch}
          onNewPairing={newPairing}
          onBackToRoster={backToRoster}
        />
      )}

      {/* Footer link to sign in */}
      <p className="mt-8 text-center text-sm text-ink-subtle">
        Want to track stats & tournaments?{' '}
        <Link href="/login" className="text-gold hover:text-gold-bright font-medium transition-colors">
          Sign in
        </Link>
      </p>
    </div>
  )
}

// ─── Roster Phase ──────────────────────────────────────────────────────────────

function RosterPhase({
  roster, onAdd, onRemove, onNext,
}: {
  roster:    Player[]
  onAdd:     (name: string) => void
  onRemove:  (id: string) => void
  onNext:    () => void
}) {
  const [input, setInput] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  function handleAdd() {
    const name = input.trim()
    if (!name) return
    onAdd(name)
    setInput('')
    inputRef.current?.focus()
  }

  function handleKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') handleAdd()
  }

  return (
    <div className="space-y-4">
      {/* Add player card */}
      <div className="rounded-2xl border border-line bg-surface-raised p-5 space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-ink-subtle flex items-center gap-2">
          <UserPlus className="h-4 w-4" />
          Add players
        </h2>

        <div className="flex gap-2">
          <div className="flex-1">
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Player name…"
              maxLength={40}
              autoFocus
              className={cn(
                'w-full rounded-lg border border-line bg-surface-elevated',
                'px-3 py-2.5 text-sm text-ink placeholder:text-ink-subtle',
                'focus:outline-none focus:ring-2 focus:ring-gold/60 focus:border-gold/60',
                'transition-colors',
              )}
            />
          </div>
          <Button
            onClick={handleAdd}
            disabled={!input.trim()}
            variant="secondary"
            className="shrink-0 px-4"
          >
            Add
          </Button>
        </div>

        {/* Player list */}
        {roster.length === 0 ? (
          <p className="py-4 text-center text-sm text-ink-subtle">
            No players yet — add at least 2 to start
          </p>
        ) : (
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {roster.map(p => (
              <li
                key={p.id}
                className="flex items-center gap-2 rounded-xl border border-line
                  bg-surface-elevated px-3 py-2"
              >
                <Avatar name={p.name} size="sm" />
                <span className="flex-1 truncate text-sm font-medium text-ink">
                  {p.name}
                </span>
                <button
                  onClick={() => onRemove(p.id)}
                  className="ml-auto text-ink-subtle hover:text-loss transition-colors"
                  aria-label={`Remove ${p.name}`}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Button
        onClick={onNext}
        disabled={roster.length < 2}
        size="lg"
        className="w-full gap-2"
      >
        <Zap className="h-5 w-5" />
        Set up match — {roster.length} player{roster.length !== 1 ? 's' : ''}
      </Button>
    </div>
  )
}

// ─── Setup Phase ───────────────────────────────────────────────────────────────

function SetupPhase({
  roster, defaultTarget, onStart, onBack,
}: {
  roster:        Player[]
  defaultTarget: number
  onStart:       (p1: Player, p2: Player, target: number) => void
  onBack:        () => void
}) {
  // Auto-select P1/P2 when we have exactly the right players already
  const [p1Id,   setP1Id]   = useState<string | null>(roster.length >= 2 ? roster[0].id : null)
  const [p2Id,   setP2Id]   = useState<string | null>(roster.length >= 2 ? roster[1].id : null)
  const [target, setTarget] = useState(defaultTarget)

  const p1 = roster.find(p => p.id === p1Id)
  const p2 = roster.find(p => p.id === p2Id)
  const ready = !!(p1 && p2)

  /** Tap a player card to cycle: unselected → P1 → P2 → unselected */
  function handleTap(id: string) {
    if (p1Id === id) {
      // Was P1 → remove from P1, promote P2 if set
      setP1Id(p2Id)
      setP2Id(null)
    } else if (p2Id === id) {
      // Was P2 → deselect
      setP2Id(null)
    } else if (!p1Id) {
      setP1Id(id)
    } else if (!p2Id) {
      setP2Id(id)
    } else {
      // Both slots taken → replace P2
      setP2Id(id)
    }
  }

  return (
    <div className="space-y-4">
      {/* Back */}
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1 text-sm text-ink-muted hover:text-ink transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
        Players
      </button>

      {/* VS preview + race-to */}
      <div className="rounded-2xl border border-line bg-surface-raised p-5">
        <div className="flex items-center gap-4">
          <PlayerSlot player={p1} label="Player 1" />
          <div className="flex flex-col items-center shrink-0 gap-1">
            <Users className="h-5 w-5 text-ink-subtle" />
            <span className="text-xs text-ink-subtle">vs</span>
          </div>
          <PlayerSlot player={p2} label="Player 2" />
        </div>

        {/* Match length */}
        <div className="mt-5">
          <label className="block text-xs font-medium text-ink-muted uppercase tracking-wide mb-2">
            Race to
          </label>
          <div className="grid grid-cols-5 gap-1.5">
            {TARGET_OPTIONS.map(o => (
              <button
                key={o.v}
                onClick={() => setTarget(o.v)}
                className={cn(
                  'rounded-lg border py-2 text-xs font-semibold transition-all',
                  target === o.v
                    ? 'border-gold bg-gold/10 text-gold'
                    : 'border-line bg-surface-elevated text-ink-muted hover:border-gold/40 hover:text-ink',
                )}
              >
                {o.v}
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-xs text-ink-subtle text-center">
            Race to {target} {target === 1 ? 'point' : 'points'}
          </p>
        </div>
      </div>

      {/* Player selection — only shown when more than 2 players to choose from */}
      {roster.length > 2 && (
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-subtle pl-1">
            Tap a player to assign P1 / P2
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {roster.map(p => {
              const isP1 = p.id === p1Id
              const isP2 = p.id === p2Id
              return (
                <button
                  key={p.id}
                  onClick={() => handleTap(p.id)}
                  className={cn(
                    'rounded-xl border p-3 transition-all text-center',
                    isP1 ? 'border-gold bg-gold/10 ring-1 ring-gold/30' :
                    isP2 ? 'border-win  bg-win/10  ring-1 ring-win/30'  :
                    'border-line bg-surface-raised hover:border-gold/40',
                  )}
                >
                  <Avatar name={p.name} size="sm" className="mx-auto" />
                  <p className="text-xs font-medium text-ink truncate mt-1.5">{p.name}</p>
                  <span className={cn(
                    'mt-1 inline-block text-[10px] font-bold px-2 py-0.5 rounded-full',
                    isP1 ? 'bg-gold/20 text-gold' :
                    isP2 ? 'bg-win/20 text-win'   :
                    'bg-surface-elevated text-ink-subtle',
                  )}>
                    {isP1 ? 'P1' : isP2 ? 'P2' : 'Tap'}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Ready hint for 2-player auto-select */}
      {roster.length === 2 && ready && (
        <p className="text-center text-xs text-win/80">
          ✓ Both players ready — adjust race length above, then start!
        </p>
      )}

      <Button
        onClick={() => p1 && p2 && onStart(p1, p2, target)}
        disabled={!ready}
        size="lg"
        className="w-full gap-2"
      >
        <Target className="h-5 w-5" />
        {ready
          ? `Start match — ${p1!.name} vs ${p2!.name} · Race to ${target}`
          : 'Select two players above'}
      </Button>
    </div>
  )
}

function PlayerSlot({ player, label }: { player?: Player; label: string }) {
  return (
    <div className="flex-1 flex flex-col items-center gap-2 text-center">
      {player ? (
        <>
          <Avatar name={player.name} size="md" />
          <p className="text-sm font-medium text-ink truncate max-w-full px-1">
            {player.name}
          </p>
        </>
      ) : (
        <>
          <div className="h-9 w-9 rounded-full border-2 border-dashed border-line" />
          <p className="text-xs text-ink-subtle">{label}</p>
        </>
      )}
    </div>
  )
}

// ─── Playing Phase ─────────────────────────────────────────────────────────────

function PlayingPhase({
  match, onRecord,
}: {
  match:    ActiveMatch
  onRecord: (winnerId: string, type: GameType) => void
}) {
  const [winner,   setWinner]   = useState<string | null>(null)
  const [gameType, setGameType] = useState<GameType>('NORMAL')

  const pts = MULTIPLIER[gameType]

  function confirm() {
    if (!winner) return
    onRecord(winner, gameType)
    setWinner(null)
    setGameType('NORMAL')
  }

  return (
    <div className="space-y-4">
      {/* ScoreBoard */}
      <ScoreBoard match={match} />

      {/* Record game */}
      <div className="rounded-xl border border-line bg-surface-raised p-5 space-y-5">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-subtle">
          Record a game
        </h3>

        {/* Who won? */}
        <div className="space-y-2">
          <p className="text-xs text-ink-muted">Who won this game?</p>
          <div className="grid grid-cols-2 gap-3">
            {[match.p1, match.p2].map(p => (
              <button
                key={p.id}
                onClick={() => setWinner(p.id)}
                className={cn(
                  'rounded-xl border-2 px-3 py-4 text-sm font-semibold transition-all duration-150 active:scale-[0.97]',
                  winner === p.id
                    ? 'border-gold bg-gold/15 text-gold shadow-gold'
                    : 'border-line bg-surface-elevated text-ink-muted hover:border-gold/40 hover:text-ink',
                )}
              >
                <span className="block truncate">{p.name}</span>
                {winner === p.id && (
                  <CheckCircle2 className="mx-auto mt-1 h-4 w-4 text-gold" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Game type */}
        <div className="space-y-2">
          <p className="text-xs text-ink-muted">Game type</p>
          <div className="grid grid-cols-3 gap-2">
            {GAME_TYPES.map(t => (
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
                <span className="block">{TYPE_LABEL[t]}</span>
                <span className="block text-[10px] opacity-70">×{MULTIPLIER[t]}</span>
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

        <Button
          onClick={confirm}
          disabled={!winner}
          className="w-full gap-2"
        >
          <CheckCircle2 className="h-4 w-4" />
          Confirm game
        </Button>
      </div>

      {/* Game log */}
      {match.games.length > 0 && (
        <div className="rounded-xl border border-line bg-surface-raised p-4 space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-subtle">
            Game log
          </h3>
          <ol className="space-y-1">
            {match.games.map((g, i) => {
              const scorer = g.winnerId === match.p1.id ? match.p1.name : match.p2.name
              return (
                <li key={i} className="flex items-center gap-2 text-xs text-ink-muted">
                  <span className="w-4 text-right text-ink-subtle shrink-0">{i + 1}.</span>
                  <span className="font-medium text-ink">{scorer}</span>
                  <span>· {TYPE_LABEL[g.type]}</span>
                  <span className="ml-auto font-semibold text-gold">+{g.points}</span>
                </li>
              )
            })}
          </ol>
        </div>
      )}
    </div>
  )
}

// ─── Complete Phase ────────────────────────────────────────────────────────────

function CompletePhase({
  match, onRematch, onNewPairing, onBackToRoster,
}: {
  match:          ActiveMatch
  onRematch:      () => void
  onNewPairing:   () => void
  onBackToRoster: () => void
}) {
  const winner = match.winnerId === match.p1.id ? match.p1 : match.p2
  const loser  = match.winnerId === match.p1.id ? match.p2 : match.p1

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Winner card */}
      <div className="rounded-2xl border border-win/40 bg-win/5 p-8 text-center space-y-4">
        <Trophy className="mx-auto h-12 w-12 text-win" />
        <div>
          <p className="text-xs uppercase tracking-widest text-ink-subtle mb-1">Winner</p>
          <h2 className="text-3xl font-black text-win">{winner.name}</h2>
          <p className="mt-2 text-sm text-ink-muted">
            {match.winnerId === match.p1.id ? match.p1Score : match.p2Score}
            {' – '}
            {match.winnerId === match.p1.id ? match.p2Score : match.p1Score}
            {' '}
            over {loser.name} (race to {match.target})
          </p>
        </div>
      </div>

      {/* Final scoreboard */}
      <ScoreBoard match={match} />

      {/* Game log */}
      {match.games.length > 0 && (
        <div className="rounded-xl border border-line bg-surface-raised p-4 space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-subtle">
            Game log
          </h3>
          <ol className="space-y-1">
            {match.games.map((g, i) => {
              const scorer = g.winnerId === match.p1.id ? match.p1.name : match.p2.name
              return (
                <li key={i} className="flex items-center gap-2 text-xs text-ink-muted">
                  <span className="w-4 text-right text-ink-subtle shrink-0">{i + 1}.</span>
                  <span className="font-medium text-ink">{scorer}</span>
                  <span>· {TYPE_LABEL[g.type]}</span>
                  <span className="ml-auto font-semibold text-gold">+{g.points}</span>
                </li>
              )
            })}
          </ol>
        </div>
      )}

      {/* Action buttons */}
      <div className="grid grid-cols-2 gap-3">
        <Button onClick={onRematch} variant="secondary" className="gap-2">
          <RotateCcw className="h-4 w-4" />
          Rematch
        </Button>
        <Button onClick={onNewPairing} variant="secondary" className="gap-2">
          <RefreshCcw className="h-4 w-4" />
          New pairing
        </Button>
      </div>

      <Button onClick={onBackToRoster} variant="ghost" className="w-full gap-2">
        <Users className="h-4 w-4" />
        Back to player roster
      </Button>
    </div>
  )
}

// ─── Inline ScoreBoard ─────────────────────────────────────────────────────────

function ScoreBoard({ match }: { match: ActiveMatch }) {
  const p1Won  = match.winnerId === match.p1.id
  const p2Won  = match.winnerId === match.p2.id
  const isOver = !!match.winnerId

  return (
    <div className="rounded-2xl border border-line bg-surface-raised p-6">
      {/* Scores */}
      <div className="flex items-stretch gap-4">
        <PlayerScore
          name={match.p1.name}
          score={match.p1Score}
          align="left"
          won={p1Won}
          lost={isOver && !p1Won}
          leading={!isOver && match.p1Score > match.p2Score}
        />
        <div className="flex flex-col items-center justify-center gap-1 shrink-0">
          <div className="h-10 w-px bg-line/60" />
          <span className="text-xs font-semibold uppercase tracking-widest text-ink-subtle">vs</span>
          <div className="h-10 w-px bg-line/60" />
        </div>
        <PlayerScore
          name={match.p2.name}
          score={match.p2Score}
          align="right"
          won={p2Won}
          lost={isOver && !p2Won}
          leading={!isOver && match.p2Score > match.p1Score}
        />
      </div>

      {/* Race to label */}
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
          { player: match.p1, score: match.p1Score, won: p1Won },
          { player: match.p2, score: match.p2Score, won: p2Won },
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
            {p1Won ? match.p1.name : match.p2.name} wins the match!
          </span>
        </div>
      )}
    </div>
  )
}

function PlayerScore({
  name, score, align, won, lost, leading,
}: {
  name: string; score: number; align: 'left' | 'right'
  won?: boolean; lost?: boolean; leading?: boolean
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
