'use client'

import { useState, useMemo, useRef } from 'react'
import Link                   from 'next/link'
import {
  Plus, LogIn, Search, Trophy, ChevronRight,
  BarChart2, Settings, Bot, GraduationCap,
  Play, UserPlus2, Swords, TrendingUp, Flame,
  ChevronDown, Users, Zap, Globe,
} from 'lucide-react'
import { Button }              from '@/components/ui/button'
import { Input }               from '@/components/ui/input'
import { TournamentCard }      from './tournament-card'
import { JoinDialog }          from './join-dialog'
import { QuickMatchDialog }    from '@/components/quick-game/quick-match-dialog'
import { FairPlayBanner }      from '@/components/lobby/fair-play-banner'
import { MatchmakingWidget }   from '@/components/lobby/matchmaking-widget'
import { BoardGlimpse }        from '@/components/lobby/board-glimpse'
import { archiveTournament }   from '@/actions/tournament'
import { cn }                  from '@/lib/utils'
import type { Tournament, SessionUser } from '@/types'
import type { LobbyHeader }    from '@/actions/stats'

type FilterKey = 'all' | 'mine' | 'active' | 'discover'

interface LobbyClientProps {
  initialTournaments: Tournament[]
  currentUser:        SessionUser | null
  header?:            LobbyHeader | null
}

function greeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

export function LobbyClient({ initialTournaments, currentUser, header }: LobbyClientProps) {
  const [tournaments, setTournaments]       = useState<Tournament[]>(initialTournaments)
  const [search, setSearch]                 = useState('')
  const [filter, setFilter]                 = useState<FilterKey>('all')
  const [joinOpen, setJoinOpen]             = useState(false)
  const [quickMatchOpen, setQuickMatchOpen] = useState(false)
  const [tournamentsOpen, setTournamentsOpen] = useState(true)
  const tournamentsRef = useRef<HTMLDivElement>(null)

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
    { key: 'all',      label: 'Mine',     count: totalCount  },
    { key: 'active',   label: 'Active',   count: activeCount },
    { key: 'discover', label: 'Discover', count: discoverCount > 0 ? discoverCount : undefined },
  ]

  return (
    <div className="flex flex-col gap-5 animate-fade-in">

      {/* ── Greeting ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gold">My Backgammon Club</p>
          <h1 className="font-display text-xl font-bold text-ink mt-0.5">
            {greeting()}{currentUser ? `, ${currentUser.name.split(' ')[0]}` : ''}
          </h1>
        </div>
        <Link
          href="/settings"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-line
            bg-surface-raised text-ink-muted hover:text-ink hover:border-gold/30 transition-all"
          aria-label="Settings"
        >
          <Settings className="h-4 w-4" />
        </Link>
      </div>

      {/* ── Stats ribbon ──────────────────────────────────────────────── */}
      {header && (
        <div className="grid grid-cols-3 gap-2">
          <StatPill
            icon={TrendingUp}
            label="Rating"
            value={String(header.rating)}
            tint="bg-gold/15 text-gold"
          />
          <StatPill
            icon={Flame}
            label="Streak"
            value={header.streakType ? `${header.streakCount} ${header.streakType === 'win' ? 'W' : 'L'}` : '—'}
            tint={header.streakType === 'win' ? 'bg-gold/15 text-gold' : header.streakType === 'loss' ? 'bg-loss/15 text-loss' : 'bg-surface-elevated text-ink-subtle'}
          />
          <StatPill
            icon={Trophy}
            label="Win rate"
            value={header.totalMatches > 0 ? `${header.winRate}%` : '—'}
            tint="bg-jade/15 text-jade"
          />
        </div>
      )}

      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl border border-line shadow-md">
        <BoardGlimpse />
        <div className="absolute inset-0 bg-gradient-to-r from-surface-base via-surface-base/88 to-transparent" />
        <div className="relative flex flex-col gap-4 p-5">
          <div>
            <span className="rounded-full bg-jade/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-jade">
              Free to play
            </span>
            <h2 className="font-display text-2xl font-bold leading-tight text-ink mt-2">
              Your move<span className="text-gold">.</span>
            </h2>
            <p className="mt-1 text-sm text-ink-muted">
              Start a quick match or invite a friend.
            </p>
          </div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={() => setQuickMatchOpen(true)}
              className="group flex items-center gap-2 rounded-xl border border-gold-dim/60
                bg-gradient-to-b from-gold-bright to-gold px-5 py-3 text-sm font-bold text-surface-canvas
                shadow-[inset_0_1px_0_0_rgb(255_255_255_/_0.25),0_4px_16px_-4px_hsl(var(--gold)/0.6)]
                transition-all hover:to-gold-bright active:scale-[0.97]"
            >
              <Play className="h-4 w-4 fill-current" />
              Play Now
              <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </button>
            <Link
              href="/players"
              className="flex items-center gap-2 rounded-xl border border-line bg-surface-raised/80
                px-4 py-3 text-sm font-semibold text-ink backdrop-blur transition-colors hover:border-gold/40"
            >
              <UserPlus2 className="h-4 w-4 text-gold" />
              Invite a friend
            </Link>
          </div>
        </div>
      </div>

      {/* ── Ranked matchmaking ─────────────────────────────────────────── */}
      {currentUser && <MatchmakingWidget />}

      {/* ── Quick nav grid ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-2">
        <QuickNavTile href="/practice"    icon={<Bot className="h-5 w-5" />}         label="Practice" />
        <QuickNavTile href="/lessons"     icon={<GraduationCap className="h-5 w-5" />} label="Lessons" />
        <QuickNavTile href="/players"     icon={<Users className="h-5 w-5" />}        label="Players" />
        <QuickNavTile href="/stats"       icon={<BarChart2 className="h-5 w-5" />}    label="Stats" />
      </div>

      {/* ── Tournaments Hub ────────────────────────────────────────────── */}
      <div
        ref={tournamentsRef}
        className="flex flex-col rounded-2xl border border-line bg-surface-raised overflow-hidden"
      >
        {/* Hub header — tap to expand/collapse */}
        <button
          type="button"
          onClick={() => setTournamentsOpen(o => !o)}
          className="flex items-center justify-between gap-3 px-4 py-3.5 text-left
            transition-colors hover:bg-surface-elevated/50"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gold/15 text-gold">
              <Trophy className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-ink text-sm">Tournaments</p>
              <p className="text-[11px] text-ink-subtle truncate">
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

        {/* Expandable body */}
        {tournamentsOpen && (
          <div className="flex flex-col gap-3 border-t border-line px-4 pb-4 pt-3">

            {/* Action buttons row */}
            <div className="grid grid-cols-3 gap-2">
              <TournamentActionBtn
                href="/tournaments/new"
                icon={<Plus className="h-4 w-4" />}
                label="New"
                accent
              />
              <TournamentActionBtn
                onClick={() => setJoinOpen(true)}
                icon={<LogIn className="h-4 w-4" />}
                label="Join"
              />
              <TournamentActionBtn
                onClick={openDiscover}
                icon={<Globe className="h-4 w-4" />}
                label="Discover"
                badge={discoverCount > 0 ? discoverCount : undefined}
              />
            </div>

            {/* Filter tabs */}
            <div className="flex items-center gap-1 rounded-xl border border-line bg-surface-base p-1">
              {filterTabs.map(({ key, label, count }) => (
                <button
                  key={key}
                  onClick={() => setFilter(key)}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium transition-all',
                    filter === key
                      ? 'bg-surface-raised text-gold shadow-sm'
                      : 'text-ink-subtle hover:text-ink-muted',
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

            {/* Search */}
            <Input
              name="search"
              placeholder="Search tournaments…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              leading={<Search className="h-4 w-4" />}
            />

            {/* Cards */}
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

      {/* ── Recent matches ─────────────────────────────────────────────── */}
      {header && header.recentMatches.length > 0 && (
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-2 font-semibold text-sm text-ink">
              <Swords className="h-3.5 w-3.5 text-gold" /> Recent matches
            </h3>
            <Link href="/stats" className="text-xs font-medium text-gold hover:underline">View all</Link>
          </div>
          <div className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface-raised">
            {header.recentMatches.map((m, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3 hover:bg-surface-elevated/60 transition-colors">
                <span className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold shrink-0',
                  m.win ? 'bg-jade/15 text-jade' : 'bg-loss/15 text-loss',
                )}>
                  {m.win ? 'W' : 'L'}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">vs {m.opponentName}</p>
                  <p className="text-xs text-ink-subtle">{m.date}</p>
                </div>
                <span className="font-mono text-sm font-bold tabular-nums text-ink shrink-0">{m.score}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Fair Play ──────────────────────────────────────────────────── */}
      <FairPlayBanner />

      {joinOpen && (
        <JoinDialog open={joinOpen} onClose={() => setJoinOpen(false)} />
      )}

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

// ─── Stat Pill ────────────────────────────────────────────────────────────────

function StatPill({ icon: Icon, label, value, tint }: {
  icon: React.ElementType; label: string; value: string; tint: string
}) {
  return (
    <div className="flex flex-col items-center gap-1.5 rounded-xl border border-line bg-surface-raised px-2 py-3 text-center">
      <div className={cn('flex h-7 w-7 items-center justify-center rounded-lg', tint)}>
        <Icon className="h-3.5 w-3.5" />
      </div>
      <p className="text-base font-bold leading-none text-ink tabular-nums">{value}</p>
      <p className="text-[10px] uppercase tracking-wide text-ink-subtle">{label}</p>
    </div>
  )
}

// ─── Quick Nav Tile ───────────────────────────────────────────────────────────

function QuickNavTile({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center gap-1.5 rounded-xl border border-line bg-surface-raised
        px-1 py-3 text-center transition-all active:scale-[0.96]
        hover:border-gold/30 hover:bg-surface-elevated"
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-elevated text-ink-muted">
        {icon}
      </span>
      <span className="text-[11px] font-medium text-ink-muted leading-tight">{label}</span>
    </Link>
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
      ? 'border-gold/40 bg-gold/8 hover:bg-gold/12 text-gold'
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
        <LogIn className="h-4 w-4" />
        Join with invite code
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
