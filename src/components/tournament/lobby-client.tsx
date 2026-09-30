'use client'

import { useState, useMemo, useRef, useCallback } from 'react'
import { useRouter }           from 'next/navigation'
import Link                   from 'next/link'
import {
  Plus, LogIn, Search, Trophy, ChevronRight,
  Settings, Bot, UserPlus2,
  ChevronDown, Globe, Zap,
  RotateCcw, Sparkles, CalendarDays, Clock,
} from 'lucide-react'
import { Button }              from '@/components/ui/button'
import { Input }               from '@/components/ui/input'
import { Avatar }              from '@/components/ui/avatar'
import { TournamentCard }      from './tournament-card'
import { JoinDialog }          from './join-dialog'
import { QuickMatchDialog }    from '@/components/quick-game/quick-match-dialog'
import { FairPlayBanner }      from '@/components/lobby/fair-play-banner'
import { MatchmakingWidget }   from '@/components/lobby/matchmaking-widget'
import { archiveTournament }   from '@/actions/tournament'
import { cn }                  from '@/lib/utils'
import type { Tournament, SessionUser } from '@/types'
import { TOURNAMENT_STATUS_LABEL } from '@/types'
import type { LobbyHeader, LobbyRecentMatch } from '@/actions/stats'

type FilterKey = 'all' | 'mine' | 'active' | 'discover'

const QG_ROSTER_KEY  = 'qg_roster_v1'
const QG_RACE_TO_KEY = 'qg_race_to_v1'
const DEFAULT_RACE_TO = 5

interface LobbyClientProps {
  initialTournaments: Tournament[]
  currentUser:        SessionUser | null
  header?:            LobbyHeader | null
}

export function LobbyClient({ initialTournaments, currentUser, header }: LobbyClientProps) {
  const router = useRouter()
  const [tournaments, setTournaments]       = useState<Tournament[]>(initialTournaments)
  const [search, setSearch]                 = useState('')
  const [filter, setFilter]                 = useState<FilterKey>('all')
  const [joinOpen, setJoinOpen]             = useState(false)
  const [quickMatchOpen, setQuickMatchOpen] = useState(false)
  const [tournamentsOpen, setTournamentsOpen] = useState(false)
  const tournamentsRef = useRef<HTMLDivElement>(null)

  // Start a Quick Game against a specific opponent — same localStorage
  // contract the QuickMatchDialog uses, so /quick-game picks it up
  // identically whether it came from a fresh pick or a rematch tap.
  const startRematch = useCallback((opponent: LobbyRecentMatch) => {
    if (!currentUser) return
    const opponentId = opponent.opponentPlayerId ?? `guest:${Math.random().toString(36).slice(2, 10)}`
    const roster = [
      { id: currentUser.id, name: currentUser.name },
      { id: opponentId,     name: opponent.opponentName },
    ]
    localStorage.setItem(QG_ROSTER_KEY,  JSON.stringify(roster))
    localStorage.setItem(QG_RACE_TO_KEY, String(DEFAULT_RACE_TO))
    router.push('/quick-game')
  }, [currentUser, router])

  // Recent matches, deduped to one row per opponent (most recent first) —
  // "Played Recently" is a list of people, not a full match log.
  const recentOpponents = useMemo(() => {
    if (!header) return []
    const seen = new Set<string>()
    const out: LobbyRecentMatch[] = []
    for (const m of header.recentMatches) {
      const key = m.opponentPlayerId ?? m.opponentName
      if (seen.has(key)) continue
      seen.add(key)
      out.push(m)
      if (out.length === 3) break
    }
    return out
  }, [header])

  function handleDelete(id: string) {
    setTournaments(prev => prev.filter(t => t.id !== id))
  }

  async function handleArchive(id: string) {
    const result = await archiveTournament({ tournamentId: id })
    if (result.success) {
      setTournaments(prev =>
        prev.map(t => t.id === id ? { ...t, status: 'ARCHIVED' } : t),
      )
    }
  }

  function handleEnd(id: string) {
    setTournaments(prev =>
      prev.map(t => t.id === id ? { ...t, status: 'COMPLETED' } : t),
    )
  }

  function openDiscover() {
    setFilter('discover')
    setTournamentsOpen(true)
    setTimeout(() => tournamentsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80)
  }

  const filtered = useMemo(() => {
    return tournaments
      .filter(t => t.deletedAt === null)
      .filter(t => {
        if (filter === 'mine')     return t.isMember || t.isOwner
        if (filter === 'active')   return t.status === 'ACTIVE' && (t.isMember || t.isOwner)
        if (filter === 'discover') return !t.isMember && !t.isOwner && !t.isPrivate && t.status !== 'ARCHIVED'
        if (t.status === 'ARCHIVED') return t.isMember || t.isOwner
        return t.isMember || t.isOwner || t.status === 'ACTIVE'
      })
      .filter(t =>
        search.trim() === '' ||
        t.name.toLowerCase().includes(search.toLowerCase()) ||
        (t.location ?? '').toLowerCase().includes(search.toLowerCase()),
      )
  }, [tournaments, filter, search])

  const activeCount   = tournaments.filter(t => !t.deletedAt && t.status === 'ACTIVE' && (t.isMember || t.isOwner)).length
  const discoverCount = tournaments.filter(t => !t.deletedAt && !t.isMember && !t.isOwner && !t.isPrivate && t.status !== 'ARCHIVED').length
  const totalCount    = tournaments.filter(t => !t.deletedAt && (t.isMember || t.isOwner)).length

  const filterTabs: { key: FilterKey; label: string; count?: number }[] = [
    { key: 'all',      label: 'Mine',     count: totalCount },
    { key: 'active',   label: 'Active',   count: activeCount },
    { key: 'discover', label: 'Discover', count: discoverCount > 0 ? discoverCount : undefined },
  ]

  return (
    <div className="flex flex-col gap-5 animate-fade-in">

      {/* ── Greeting ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-gold opacity-90">
            My Backgammon Club
          </p>
          <h1 className="font-display text-2xl font-semibold text-ink mt-1">
            Hi{currentUser ? `, ${currentUser.name.split(' ')[0]}` : ''}
          </h1>
        </div>
        {currentUser ? (
          <Link href="/settings" aria-label="Settings" className="shrink-0">
            <Avatar name={currentUser.name} src={currentUser.avatarUrl} size="md" />
          </Link>
        ) : (
          <Link
            href="/settings"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-line
              bg-surface-raised text-ink-muted hover:border-gold/30 hover:text-gold transition-all"
            aria-label="Settings"
          >
            <Settings className="h-4 w-4" />
          </Link>
        )}
      </div>

      {/* ── Hero: Ready to play?  +  Your Standing (desktop) ────────────── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.6fr_1fr]">
        <div className="gloss rounded-2xl p-6 text-center lg:text-left lg:flex lg:flex-col lg:justify-center lg:px-8">
          <p className="font-display text-xl font-semibold text-ink lg:text-2xl">Ready to play?</p>
          <p className="mt-1 text-sm text-ink/80">Pick who's across the board</p>
          <div className="lg:flex lg:gap-3">
            <button
              type="button"
              onClick={() => setQuickMatchOpen(true)}
              className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-2xl
                bg-ink text-base font-bold text-surface-elevated
                shadow-md transition-all hover:brightness-110 active:scale-[0.98]
                lg:w-auto lg:px-7"
            >
              <Sparkles className="h-4 w-4" />
              Start a Game
            </button>
          </div>
          <p className="mt-2.5 text-xs text-ink/70">
            Choose an opponent, set the race, and you're playing
          </p>
        </div>

        {/* Your Standing — desktop only; needs real rated-game history to mean anything */}
        {currentUser && header && header.ratedGames > 0 && (
          <div className="hidden rounded-2xl border border-line bg-surface-raised p-6 lg:flex lg:flex-col lg:justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-gold">Your Standing</p>
              <p className="font-display text-3xl font-semibold text-ink mt-1.5">{header.rating}</p>
              {header.rank && (
                <p className="text-xs font-semibold text-win mt-0.5">Rank #{header.rank} in the club</p>
              )}
            </div>
            {header.recentForm.length > 1 && (
              <div className="mt-4 flex items-end gap-1 h-10">
                {header.recentForm.map((won, i) => (
                  <div
                    key={i}
                    className={cn('flex-1 rounded-sm', won ? 'bg-gold-bright h-full' : 'bg-line h-2/5')}
                    title={won ? 'Win' : 'Loss'}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Played Recently ───────────────────────────────────────────── */}
      {currentUser && recentOpponents.length > 0 && (
        <div className="flex flex-col gap-2.5">
          <SectionLabel>Played Recently</SectionLabel>
          <div className="flex flex-col gap-2 lg:grid lg:grid-cols-2 lg:gap-2.5">
            {recentOpponents.map((m, i) => (
              <div
                key={m.opponentPlayerId ?? `${m.opponentName}-${i}`}
                className="flex items-center gap-3 rounded-2xl border border-line bg-surface-raised
                  px-3.5 py-3 shadow-sm"
              >
                <Avatar name={m.opponentName} size="md" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-ink">{m.opponentName}</p>
                  <p className="text-xs text-ink-subtle">
                    {m.win ? 'You won last time' : 'They won last time'} · {m.date}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => startRematch(m)}
                  className="gloss flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2
                    text-xs font-bold text-ink transition-transform active:scale-95"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Rematch
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Other ways to play (mobile) / Choose your mode (desktop) ────── */}
      <div className="flex flex-col gap-2.5 lg:hidden">
        <SectionLabel>Other Ways to Play</SectionLabel>
        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => setQuickMatchOpen(true)}
            className="flex flex-col items-center gap-1.5 rounded-2xl border border-line
              bg-surface-raised py-4 text-center shadow-sm transition-all
              active:scale-[0.97] hover:border-gold/30"
          >
            <UserPlus2 className="h-5 w-5 text-gold" />
            <span className="font-display text-sm font-semibold text-ink">Someone New</span>
          </button>
          <Link
            href="/practice"
            className="flex flex-col items-center gap-1.5 rounded-2xl border border-line
              bg-surface-raised py-4 text-center shadow-sm transition-all
              active:scale-[0.97] hover:border-gold/30"
          >
            <Bot className="h-5 w-5 text-jade" />
            <span className="font-display text-sm font-semibold text-ink">vs AI</span>
          </Link>
        </div>
      </div>

      {/* Desktop mode grid — same destinations, richer real estate to use */}
      <div className="hidden flex-col gap-2.5 lg:flex">
        <div className="flex items-baseline justify-between">
          <SectionLabel>Choose your mode</SectionLabel>
        </div>
        <div className="grid grid-cols-4 gap-3.5">
          <ModeTile
            onClick={() => router.push('/practice')}
            label="Play vs AI" desc="Easy, Medium or Hard" meta="Solo"
            bg="bg-jade/12" fg="text-jade" icon={<Bot className="h-[18px] w-[18px]" />}
          />
          <ModeTile
            onClick={() => setQuickMatchOpen(true)}
            label="Online" desc="Play someone from the club" meta="Pick an opponent"
            bg="bg-silver/12" fg="text-silver" icon={<Globe className="h-[18px] w-[18px]" />}
          />
          <ModeTile
            onClick={() => router.push('/play')}
            label="Local Play" desc="Pass & play, same device" meta="2 players"
            bg="bg-gold/12" fg="text-gold" icon={<UserPlus2 className="h-[18px] w-[18px]" />}
          />
          <ModeTile
            onClick={() => router.push('/lessons')}
            label="Learn" desc="Lessons & strategy" meta="Lessons"
            bg="bg-warning/12" fg="text-warning" icon={<Zap className="h-[18px] w-[18px]" />}
          />
        </div>
      </div>

      {/* Desktop tournaments snapshot */}
      {tournaments.length > 0 && (
        <div className="hidden rounded-2xl border border-line bg-surface-raised p-6 lg:block">
          <div className="flex items-center justify-between">
            <p className="font-display text-base font-semibold text-ink">Tournaments</p>
            <span className="text-xs text-ink-subtle">{tournaments.length} joined</span>
          </div>
          <div className="mt-3.5 flex flex-col divide-y divide-line overflow-hidden rounded-xl border border-line">
            {tournaments.slice(0, 3).map(t => (
              <Link
                key={t.id}
                href={`/tournaments/${t.id}`}
                className="flex items-center justify-between bg-surface-canvas px-3.5 py-2.5 text-sm hover:bg-surface-elevated/60 transition-colors"
              >
                <span className="truncate font-medium text-ink">{t.name}</span>
                <span className={cn(
                  'shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide',
                  t.status === 'ACTIVE' ? 'bg-win/15 text-win'
                  : t.status === 'DRAFT' ? 'bg-silver/15 text-silver'
                  : 'bg-surface-muted text-ink-subtle',
                )}>
                  {t.status === 'ACTIVE' ? 'Live' : t.status === 'DRAFT' ? 'Draft' : TOURNAMENT_STATUS_LABEL[t.status]}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}



      {/* ── Daily challenge / ranked matchmaking ─────────────────────── */}
      {currentUser && <MatchmakingWidget />}

      {/* ── Tournaments Hub ────────────────────────────────────────────── */}
      <div ref={tournamentsRef} className="flex flex-col rounded-2xl border border-line bg-surface-raised overflow-hidden">
        <button
          type="button"
          onClick={() => setTournamentsOpen(o => !o)}
          className="flex items-center justify-between gap-3 px-4 py-3.5 text-left
            transition-colors hover:bg-surface-elevated/60"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gold/12 text-gold">
              <Trophy className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-sm text-ink">Tournaments</p>
              <p className="text-[11px] text-ink-subtle truncate mt-0.5">
                {totalCount > 0 ? `${totalCount} joined` : 'Create or join a tournament'}
                {activeCount > 0 && ` · ${activeCount} active`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {activeCount > 0 && (
              <span className="rounded-full bg-win/15 border border-win/25 px-2 py-0.5 text-[10px] font-bold text-win">
                {activeCount}
              </span>
            )}
            <ChevronDown className={cn(
              'h-4 w-4 text-ink-subtle transition-transform duration-200',
              tournamentsOpen && 'rotate-180',
            )} />
          </div>
        </button>

        {tournamentsOpen && (
          <div className="flex flex-col gap-3 border-t border-line px-4 pb-4 pt-3">
            <div className="grid grid-cols-3 gap-2">
              <TournamentActionBtn href="/tournaments/new" icon={<Plus className="h-4 w-4" />} label="New" accent />
              <TournamentActionBtn onClick={() => setJoinOpen(true)} icon={<LogIn className="h-4 w-4" />} label="Join" />
              <TournamentActionBtn
                onClick={openDiscover}
                icon={<Globe className="h-4 w-4" />}
                label="Discover"
                badge={discoverCount > 0 ? discoverCount : undefined}
              />
            </div>

            <div className="flex items-center gap-1 rounded-xl border border-line bg-surface-base p-1">
              {filterTabs.map(({ key, label, count }) => (
                <button
                  key={key}
                  onClick={() => setFilter(key)}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium transition-all',
                    filter === key ? 'bg-surface-raised text-gold shadow-sm' : 'text-ink-subtle hover:text-ink-muted',
                  )}
                >
                  {label}
                  {count !== undefined && count > 0 && (
                    <span className={cn(
                      'rounded-full px-1.5 py-px text-[9px] font-bold leading-none',
                      filter === key ? 'bg-gold/20 text-gold' : 'bg-surface-elevated text-ink-subtle',
                    )}>
                      {count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            <Input
              name="search"
              placeholder="Search tournaments…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              leading={<Search className="h-4 w-4" />}
            />

            {filtered.length === 0 ? (
              <TournamentEmptyState
                hasSearch={search.trim().length > 0}
                filter={filter}
                onJoin={() => setJoinOpen(true)}
                onDiscover={openDiscover}
              />
            ) : (
              <div className="flex flex-col gap-2 sm:grid sm:grid-cols-2">
                {filtered.map(t => (
                  <TournamentCard
                    key={t.id}
                    tournament={t}
                    onDelete={handleDelete}
                    onArchive={handleArchive}
                    onEnd={handleEnd}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Stats ─────────────────────────────────────────────────────── */}
      {header && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="text-[9px] font-bold uppercase tracking-[0.18em] text-ink-subtle">Your Stats</h3>
            <Link href="/stats" className="text-xs font-medium text-gold hover:underline flex items-center gap-1">
              View all <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="grid grid-cols-4 gap-2">
            <StatTile emoji="👑" value={String(header.rating)} label="ELO" />
            <StatTile emoji="🏆" value={String(header.totalMatches > 0 ? Math.round(header.winRate) : 0)} label="Win %" />
            <StatTile
              emoji={header.streakType === 'win' ? '🔥' : '📊'}
              value={header.streakType ? `${header.streakCount}${header.streakType === 'win' ? 'W' : 'L'}` : '—'}
              label="Streak"
            />
            <StatTile emoji="🎯" value={String(header.totalMatches)} label="Played" />
          </div>
        </div>
      )}

      <FairPlayBanner />

      {joinOpen && <JoinDialog open={joinOpen} onClose={() => setJoinOpen(false)} />}

      {currentUser && quickMatchOpen && (
        <QuickMatchDialog
          open={quickMatchOpen}
          onClose={() => setQuickMatchOpen(false)}
          currentUser={currentUser}
        />
      )}
    </div>
  )
}

// ─── Section Label ──────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="h-px flex-1 bg-line" />
      <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-ink-subtle">
        {children}
      </span>
      <div className="h-px flex-1 bg-line" />
    </div>
  )
}

// ─── Mode Tile (desktop "Choose your mode" grid) ──────────────────────────────

function ModeTile({
  href, onClick, icon, label, desc, meta, bg, fg,
}: {
  href?: string; onClick?: () => void
  icon: React.ReactNode; label: string; desc: string; meta: string
  bg: string; fg: string
}) {
  const cls = 'flex flex-col rounded-2xl border border-line bg-surface-raised p-5 text-left ' +
    'transition-all hover:border-gold/30 hover:shadow-sm cursor-pointer'
  const inner = (
    <>
      <div className={cn('flex h-9 w-9 items-center justify-center rounded-xl', bg, fg)}>
        {icon}
      </div>
      <p className="mt-3.5 text-sm font-semibold text-ink">{label}</p>
      <p className="mt-0.5 text-xs leading-snug text-ink-subtle">{desc}</p>
      <p className={cn('mt-2.5 text-[11px] font-bold', fg)}>{meta}</p>
    </>
  )
  if (href) return <Link href={href} className={cls}>{inner}</Link>
  return <button type="button" onClick={onClick} className={cls}>{inner}</button>
}

// ─── Stat Tile ────────────────────────────────────────────────────────────────

function StatTile({ emoji, value, label }: { emoji: string; value: string; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1.5 rounded-xl border border-line bg-surface-raised py-3 text-center">
      <span className="text-lg leading-none">{emoji}</span>
      <p className="text-base font-bold text-ink leading-none tabular-nums">{value}</p>
      <p className="text-[9px] font-semibold uppercase tracking-[0.1em] text-ink-subtle">{label}</p>
    </div>
  )
}

// ─── Tournament Action Button ─────────────────────────────────────────────────

function TournamentActionBtn({
  href, onClick, icon, label, accent, badge,
}: {
  href?: string; onClick?: () => void
  icon: React.ReactNode; label: string; accent?: boolean; badge?: number
}) {
  const cls = cn(
    'relative flex flex-col items-center gap-1.5 rounded-xl border py-3 px-2 text-center',
    'transition-all active:scale-[0.96] cursor-pointer select-none',
    accent
      ? 'border-gold/35 bg-gold/8 hover:bg-gold/12 text-gold'
      : 'border-line bg-surface-base hover:border-gold/25 hover:bg-surface-elevated text-ink-muted',
  )
  const inner = (
    <>
      <span className={cn(
        'flex h-7 w-7 items-center justify-center rounded-lg',
        accent ? 'bg-gold/15' : 'bg-surface-elevated',
      )}>
        {icon}
      </span>
      <span className="text-[11px] font-semibold leading-tight">{label}</span>
      {badge !== undefined && (
        <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center
          rounded-full bg-gold px-1 text-[9px] font-bold text-surface-canvas">
          {badge > 9 ? '9+' : badge}
        </span>
      )}
    </>
  )
  if (href) return <Link href={href} className={cls}>{inner}</Link>
  return <button type="button" onClick={onClick} className={cls}>{inner}</button>
}

// ─── Tournament Empty State ───────────────────────────────────────────────────

function TournamentEmptyState({ hasSearch, filter, onJoin, onDiscover }: {
  hasSearch: boolean; filter: FilterKey; onJoin: () => void; onDiscover: () => void
}) {
  if (hasSearch) return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-line bg-surface-base py-8 text-center">
      <Search className="h-7 w-7 text-ink-subtle/40" />
      <p className="text-sm text-ink-muted">No tournaments match your search.</p>
    </div>
  )
  if (filter === 'discover') return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-line bg-surface-base py-8 text-center">
      <Trophy className="h-7 w-7 text-ink-subtle/40" />
      <p className="text-sm text-ink-muted">No open public tournaments right now.</p>
      <Button variant="secondary" size="sm" onClick={onJoin} className="gap-1.5">
        <LogIn className="h-4 w-4" /> Join with invite code
      </Button>
    </div>
  )
  if (filter === 'active') return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-line bg-surface-base py-8 text-center">
      <Zap className="h-7 w-7 text-ink-subtle/40" />
      <p className="text-sm text-ink-muted">No active tournaments right now.</p>
      <button onClick={onDiscover} className="text-xs text-gold hover:text-gold/80 transition-colors">
        Browse open tournaments →
      </button>
    </div>
  )
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-line bg-surface-base py-8 text-center">
      <Trophy className="h-9 w-9 text-gold/30" />
      <div>
        <p className="text-sm font-semibold text-ink">No tournaments yet</p>
        <p className="mt-1 text-xs text-ink-muted">Create one, join with a code, or discover open events.</p>
      </div>
      <div className="flex items-center gap-2 flex-wrap justify-center">
        <Button variant="secondary" size="sm" onClick={onJoin} className="gap-1.5">
          <LogIn className="h-4 w-4" /> Join with code
        </Button>
        <Button asChild size="sm" className="gap-1.5">
          <Link href="/tournaments/new"><Plus className="h-4 w-4" /> Create</Link>
        </Button>
      </div>
    </div>
  )
}
