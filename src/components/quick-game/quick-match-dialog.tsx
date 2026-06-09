'use client'

/**
 * QuickMatchDialog
 *
 * Opens from the lobby.  Lets the user build a player roster by:
 *   • pre-loading themselves (always first, can't be removed)
 *   • searching for registered players by name / email
 *   • adding unnamed guest players
 *
 * Also lets the user choose a default "race to" length.
 *
 * On "Start Game":
 *   - Writes the roster to localStorage  (key: qg_roster_v1)
 *   - Writes the race-to pref to localStorage (key: qg_race_to_v1)
 *   - Navigates to /quick-game
 */

import { useState, useTransition, useRef, useEffect, useCallback } from 'react'
import { useRouter }   from 'next/navigation'
import { Search, X, UserPlus, Zap, Users, ChevronRight } from 'lucide-react'
import { Dialog }      from '@/components/ui/dialog'
import { Button }      from '@/components/ui/button'
import { Input }       from '@/components/ui/input'
import { Avatar }      from '@/components/ui/avatar'
import { cn }          from '@/lib/utils'
import { searchRegisteredPlayers } from '@/actions/quick-match'
import type { SessionUser }        from '@/types'
import type { QuickMatchPlayer }   from '@/actions/quick-match'

// ─── Constants ────────────────────────────────────────────────────────────────

const RACE_OPTIONS    = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15] as const
const QG_ROSTER_KEY   = 'qg_roster_v1'
const QG_RACE_TO_KEY  = 'qg_race_to_v1'

// ─── Types ────────────────────────────────────────────────────────────────────

interface RosterEntry {
  id:            string
  name:          string
  isGuest:       boolean
  isCurrentUser: boolean
}

export interface QuickMatchDialogProps {
  open:        boolean
  onClose:     () => void
  currentUser: SessionUser
}

// ─── Component ────────────────────────────────────────────────────────────────

export function QuickMatchDialog({ open, onClose, currentUser }: QuickMatchDialogProps) {
  const router = useRouter()

  // ── Roster ──
  const [roster, setRoster] = useState<RosterEntry[]>(() => [
    { id: currentUser.id, name: currentUser.name, isGuest: false, isCurrentUser: true },
  ])

  // ── Player search ──
  const [query,       setQuery]       = useState('')
  const [results,     setResults]     = useState<QuickMatchPlayer[]>([])
  const [showResults, setShowResults] = useState(false)
  const [isPending,   startTransition] = useTransition()
  const debounceRef  = useRef<ReturnType<typeof setTimeout>>()
  const searchWrapRef = useRef<HTMLDivElement>(null)

  // ── Guest add ──
  const [guestName,      setGuestName]      = useState('')
  const [showGuestInput, setShowGuestInput] = useState(false)
  const guestInputRef = useRef<HTMLInputElement>(null)

  // ── Race-to ──
  const [raceTo, setRaceTo] = useState(5)

  // ── Reset when dialog opens ──
  useEffect(() => {
    if (open) {
      setRoster([{ id: currentUser.id, name: currentUser.name, isGuest: false, isCurrentUser: true }])
      setQuery('')
      setResults([])
      setShowResults(false)
      setGuestName('')
      setShowGuestInput(false)
      setRaceTo(5)
    }
  }, [open, currentUser])

  // ── Focus guest input when it appears ──
  useEffect(() => {
    if (showGuestInput) guestInputRef.current?.focus()
  }, [showGuestInput])

  // ── Debounced player search ──
  const rosterIds = roster.map(r => r.id)  // stable dep

  const runSearch = useCallback((q: string) => {
    startTransition(async () => {
      const res = await searchRegisteredPlayers(q)
      if (res.success) {
        const ids = new Set(rosterIds)
        setResults(res.data.filter(p => !ids.has(p.id)))
        setShowResults(true)
      }
    })
  }, [rosterIds])  // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    clearTimeout(debounceRef.current)
    if (query.trim().length < 2) {
      setResults([])
      setShowResults(false)
      return
    }
    debounceRef.current = setTimeout(() => runSearch(query.trim()), 300)
    return () => clearTimeout(debounceRef.current)
  }, [query, runSearch])

  // ── Close dropdown on outside click ──
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (searchWrapRef.current && !searchWrapRef.current.contains(e.target as Node)) {
        setShowResults(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // ── Actions ──

  function addRegisteredPlayer(p: QuickMatchPlayer) {
    setRoster(prev => [...prev, { id: p.id, name: p.name, isGuest: false, isCurrentUser: false }])
    setQuery('')
    setResults([])
    setShowResults(false)
  }

  function addGuest() {
    const name = guestName.trim()
    if (!name) return
    const id = 'guest:' + Math.random().toString(36).slice(2, 10)
    setRoster(prev => [...prev, { id, name, isGuest: true, isCurrentUser: false }])
    setGuestName('')
    setShowGuestInput(false)
  }

  function removePlayer(id: string) {
    setRoster(prev => prev.filter(r => r.id !== id))
  }

  function handleStart() {
    const storageRoster = roster.map(r => ({ id: r.id, name: r.name }))
    localStorage.setItem(QG_ROSTER_KEY,  JSON.stringify(storageRoster))
    localStorage.setItem(QG_RACE_TO_KEY, String(raceTo))
    onClose()
    router.push('/quick-game')
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  const canStart    = roster.length >= 1
  const hasOpponent = roster.length >= 2

  return (
    <Dialog open={open} onClose={onClose} title="Quick Game Setup" size="lg">
      <div className="flex flex-col gap-5">

        {/* ── Players ───────────────────────────────────────────────────── */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Users className="h-4 w-4 text-gold" />
            <h3 className="text-sm font-semibold text-ink">Players in this game</h3>
            {roster.length > 0 && (
              <span className="ml-auto text-xs text-ink-subtle">{roster.length} added</span>
            )}
          </div>

          {/* Roster chips */}
          {roster.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {roster.map(player => (
                <div
                  key={player.id}
                  className={cn(
                    'flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
                    player.isCurrentUser
                      ? 'border-gold/30 bg-gold/10 text-gold'
                      : player.isGuest
                        ? 'border-line bg-surface-elevated text-ink-muted'
                        : 'border-line bg-surface-elevated text-ink',
                  )}
                >
                  {player.isCurrentUser && (
                    <span className="h-2 w-2 rounded-full bg-gold/60" />
                  )}
                  <span>{player.name}</span>
                  {player.isCurrentUser && (
                    <span className="text-[9px] text-gold/60">you</span>
                  )}
                  {player.isGuest && (
                    <span className="text-[9px] text-ink-subtle">guest</span>
                  )}
                  {!player.isCurrentUser && (
                    <button
                      type="button"
                      onClick={() => removePlayer(player.id)}
                      className="ml-0.5 rounded-full p-0.5 hover:bg-black/15 dark:hover:bg-white/10 transition-colors"
                      aria-label={`Remove ${player.name}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Search registered players */}
          <div ref={searchWrapRef} className="relative">
            <Input
              name="playerSearch"
              placeholder="Search registered players by name or email…"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onFocus={() => results.length > 0 && setShowResults(true)}
              leading={<Search className={cn('h-4 w-4', isPending && 'animate-pulse')} />}
              autoComplete="off"
            />

            {/* Results dropdown */}
            {showResults && results.length > 0 && (
              <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-xl border border-line bg-surface-elevated shadow-elevated overflow-hidden">
                {results.map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => addRegisteredPlayer(p)}
                    className="flex w-full items-center gap-3 px-3 py-2.5
                      hover:bg-surface-raised transition-colors text-left group"
                  >
                    <Avatar name={p.name} src={p.avatarUrl} size="sm" />
                    <span className="flex-1 text-sm text-ink truncate">{p.name}</span>
                    <span className="shrink-0 text-xs font-semibold text-gold/70 group-hover:text-gold transition-colors">
                      Add +
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* No results */}
            {showResults && !isPending && results.length === 0 && query.trim().length >= 2 && (
              <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-xl border border-line bg-surface-elevated shadow-elevated p-3">
                <p className="text-xs text-ink-muted text-center">No registered players found for "{query}"</p>
              </div>
            )}
          </div>

          {/* Add guest */}
          {!showGuestInput ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setShowGuestInput(true)}
              className="mt-2.5 w-full gap-2"
            >
              <UserPlus className="h-4 w-4" />
              Add opponent / guest (no account needed)
            </Button>
          ) : (
            <div className="mt-2.5 flex items-center gap-2">
              <input
                ref={guestInputRef}
                type="text"
                placeholder="Guest player name…"
                value={guestName}
                onChange={e => setGuestName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter')  addGuest()
                  if (e.key === 'Escape') { setShowGuestInput(false); setGuestName('') }
                }}
                className={cn(
                  'flex-1 rounded-lg border border-line bg-surface-base px-3 py-2 text-sm',
                  'text-ink placeholder:text-ink-subtle outline-none',
                  'focus:border-gold/50 focus:ring-1 focus:ring-gold/20 transition-colors',
                )}
              />
              <Button
                type="button"
                size="sm"
                onClick={addGuest}
                disabled={!guestName.trim()}
              >
                Add
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => { setShowGuestInput(false); setGuestName('') }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
        </section>

        {/* ── Divider ───────────────────────────────────────────────────── */}
        <div className="border-t border-line" />

        {/* ── Race to ───────────────────────────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-ink">Race to</h3>
            <span className="text-xs text-ink-muted">
              First to <span className="text-gold font-semibold">{raceTo}</span> points wins
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            {RACE_OPTIONS.map(n => (
              <button
                key={n}
                type="button"
                onClick={() => setRaceTo(n)}
                className={cn(
                  'h-10 w-10 rounded-xl border text-sm font-bold transition-all duration-150',
                  raceTo === n
                    ? 'border-gold/50 bg-gold/15 text-gold shadow-[0_0_14px_hsl(var(--gold)/0.18)]'
                    : 'border-line bg-surface-elevated text-ink-muted hover:border-gold/30 hover:text-ink hover:bg-surface-raised',
                )}
              >
                {n}
              </button>
            ))}
          </div>
        </section>

        {/* ── Footer ────────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-2.5 pt-1">
          {!hasOpponent && (
            <p className="text-center text-xs text-ink-subtle">
              Add an opponent above — or continue and add them on the next screen
            </p>
          )}

          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="secondary"
              className="flex-1"
              onClick={onClose}
            >
              Cancel
            </Button>

            <Button
              type="button"
              className={cn('flex-[2] gap-2', hasOpponent && 'shadow-gold')}
              onClick={handleStart}
            >
              <Zap className="h-4 w-4" />
              {hasOpponent ? (
                <>
                  Start Game
                  <span className="flex items-center gap-0.5 text-xs opacity-70">
                    · {roster.length} players
                    <ChevronRight className="h-3.5 w-3.5" />
                  </span>
                </>
              ) : (
                <>
                  Continue
                  <ChevronRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </div>

      </div>
    </Dialog>
  )
}
