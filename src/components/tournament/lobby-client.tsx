'use client'

import { useState, useMemo, useRef } from 'react'
import Link                   from 'next/link'
import {
  Plus, LogIn, Search, Trophy, Filter,
  ChevronRight, BarChart2, Settings, Bot, GraduationCap, Globe,
  Play, UserPlus2, Swords, TrendingUp, Flame,
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

/** Time-of-day greeting word. */
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
  const tournamentsRef = useRef<HTMLDivElement>(null)

  function openDiscover() {
    setFilter('discover')
    setTimeout(() => tournamentsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
  }

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

  const filtered = useMemo(() => {
    return tournaments
      .filter(t => t.deletedAt === null)
      .filter(t => {
        if (filter === 'mine')     return t.isMember || t.isOwner
        if (filter === 'active')   return t.status === 'ACTIVE' && (t.isMember || t.isOwner)
        if (filter === 'discover') return !t.isMember && !t.isOwner && !t.isPrivate && t.status !== 'ARCHIVED'
        // 'all': show user's tournaments + hide archived public ones they haven't joined
        if (t.status === 'ARCHIVED') return t.isMember || t.isOwner
        return t.isMember || t.isOwner || t.status === 'ACTIVE'
      })
      .filter(t =>
        search.trim() === '' ||
        t.name.toLowerCase().includes(search.toLowerCase()) ||
        (t.location ?? '').toLowerCase().includes(search.toLowerCase()),
      )
  }, [tournaments, filter, search])

  const filterLabels: { key: FilterKey; label: string }[] = [
    { key: 'all',      label: 'Mine' },
    { key: 'active',   label: 'Active' },
    { key: 'discover', label: 'Discover' },
  ]

  const activeCount   = tournaments.filter(t => !t.deletedAt && t.status === 'ACTIVE' && (t.isMember || t.isOwner)).length
  const discoverCount = tournaments.filter(t => !t.deletedAt && !t.isMember && !t.isOwner && !t.isPrivate && t.status !== 'ARCHIVED').length
  const totalCount    = tournaments.filter(t => !t.deletedAt && (t.isMember || t.isOwner)).length

  return (
    <div className="flex flex-col gap-6 animate-fade-in">

      {/* ── Greeting header ────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold">My Backgammon Club</p>
          <h1 className="font-display text-2xl font-bold text-ink mt-1">
            {greeting()}{currentUser ? `, ${currentUser.name.split(' ')[0]}` : ''}
          </h1>
        </div>
        <Link
          href="/settings"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-line
            bg-surface-raised text-ink-muted hover:text-ink hover:border-gold/30 transition-all"
        >
          <Settings className="h-4 w-4" />
        </Link>
      </div>

      {/* ── HERO — board glimpse + single primary CTA ────────────────── */}
      <div className="relative overflow-hidden rounded-3xl border border-line shadow-lg">
        <BoardGlimpse />
        <div className="absolute inset-0 bg-gradient-to-r from-surface-base via-surface-base/85 to-transparent" />

        <div className="relative flex flex-col gap-5 p-5 sm:p-8 lg:max-w-[62%]">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-jade/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-jade">
              Free to play
            </span>
            {activeCount > 0 && (
              <span className="rounded-full bg-win/15 border border-win/25 px-2.5 py-0.5 text-[10px] font-bold text-win">
                {activeCount} active tournament{activeCount > 1 ? 's' : ''}
              </span>
            )}
          </div>

          <div>
            <h2 className="font-display text-2xl font-bold leading-tight text-ink sm:text-4xl">
              Your move<span className="text-gold">.</span>
            </h2>
            <p className="mt-2 max-w-md text-sm text-ink-muted">
              Add players from your club or as guests, choose a race-to, and start scoring instantly.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setQuickMatchOpen(true)}
              className="group flex items-center gap-2.5 rounded-2xl border border-gold-dim/60
                bg-gradient-to-b from-gold-bright to-gold px-6 py-3.5 text-base font-bold text-surface-canvas
                shadow-[inset_0_1px_0_0_rgb(255_255_255_/_0.25),0_6px_24px_-4px_hsl(var(--gold)/0.6)]
                transition-all hover:to-gold-bright active:scale-[0.98]"
            >
              <Play className="h-5 w-5 fill-current" />
              Play Now
              <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </button>
            <Link
              href="/players"
              className="flex items-center gap-2 rounded-2xl border border-line bg-surface-raised/80
                px-5 py-3.5 text-sm font-semibold text-ink backdrop-blur transition-colors hover:border-gold/40"
            >
              <UserPlus2 className="h-4 w-4 text-gold" />
              Invite a friend
            </Link>
          </div>
        </div>
      </div>

      {/* ── Stat ribbon ───────────────────────────────────────────────── */}
      {header && (
        <div className="grid grid-cols-3 gap-3">
          <StatPill icon={TrendingUp} label="Rating" value={String(header.rating)} tint="bg-gold/15 text-gold" />
          <StatPill
            icon={Flame}
            label="Streak"
            value={header.streakType ? `${header.streakCount} ${header.streakType === 'win' ? 'W' : 'L'}` : '—'}
            tint={header.streakType === 'win' ? 'bg-gold/15 text-gold' : header.streakType === 'loss' ? 'bg-loss/15 text-loss' : 'bg-surface-elevated text-ink-subtle'}
          />
          <StatPill icon={Trophy} label="Win rate" value={header.totalMatches > 0 ? `${header.winRate}%` : '—'} tint="bg-jade/15 text-jade" />
        </div>
      )}

      {/* ── Ranked matchmaking ─────────────────────────────────────── */}
      {currentUser && <MatchmakingWidget />}

      {/* ── Action grid ────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3 sm:grid-cols-3">
        <ActionCard
          href="/tournaments/new"
          icon={<Plus className="h-5 w-5" />}
          label="New Tournament"
          desc="Create & organise"
          accent="gold"
        />
        <ActionCard
          onClick={() => setJoinOpen(true)}
          icon={<LogIn className="h-5 w-5" />}
          label="Join Tournament"
          desc="Enter invite code"
        />
        <ActionCard
          href="/practice"
          icon={<Bot className="h-5 w-5" />}
          label="Practice"
          desc="Play vs AI"
        />
        <ActionCard
          href="/lessons"
          icon={<GraduationCap className="h-5 w-5" />}
          label="Lessons"
          desc="Learn strategy"
        />
        <ActionCard
          onClick={openDiscover}
          icon={<Globe className="h-5 w-5" />}
          label="Discover"
          desc="Open tournaments"
        />
        <ActionCard
          href="/stats"
          icon={<BarChart2 className="h-5 w-5" />}
          label="My Stats"
          desc="Your record"
        />
      </div>

      {/* ── Recent matches ────────────────────────────────────────────── */}
      {header && header.recentMatches.length > 0 && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-2 font-display text-lg font-bold text-ink">
              <Swords className="h-4 w-4 text-gold" /> Recent matches
            </h3>
            <Link href="/stats" className="text-xs font-medium text-gold hover:underline">View all</Link>
          </div>

          <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface-raised">
            {header.recentMatches.map((m, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-elevated/60">
                <span className={cn(
                  'flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold shrink-0',
                  m.win ? 'bg-jade/15 text-jade' : 'bg-loss/15 text-loss',
                )}>
                  {m.win ? 'W' : 'L'}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">vs {m.opponentName}</p>
                  <p className="flex items-center gap-1 text-xs text-ink-subtle">
                    {m.date}
                  </p>
                </div>
                <span className="font-mono text-sm font-bold tabular-nums text-ink shrink-0">{m.score}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Tournaments section ─────────────────────────────────────── */}
      <div className="flex flex-col gap-4" ref={tournamentsRef}>

        {/* Section header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-gold" />
            <h2 className="text-base font-semibold text-ink">
              {filter === 'discover' ? 'Open Tournaments' : 'My Tournaments'}
            </h2>
            {activeCount > 0 && filter !== 'discover' && (
              <span className="rounded-full bg-win/15 border border-win/25 px-2 py-0.5
                text-[10px] font-semibold text-win">
                {activeCount} active
              </span>
            )}
            {filter === 'discover' && discoverCount > 0 && (
              <span className="rounded-full bg-gold/15 border border-gold/25 px-2 py-0.5
                text-[10px] font-semibold text-gold">
                {discoverCount} open
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {filter !== 'discover' && <span className="text-xs text-ink-subtle">{totalCount} total</span>}
            <Link
              href="/tournaments/new"
              className="flex items-center gap-1 rounded-lg border border-line bg-surface-raised
                px-2.5 py-1.5 text-xs font-medium text-ink-muted
                hover:border-gold/30 hover:text-ink transition-all"
            >
              <Plus className="h-3.5 w-3.5" />
              New
            </Link>
          </div>
        </div>

        {/* Search + filter */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="flex-1">
            <Input
              name="search"
              placeholder="Search tournaments…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              leading={<Search className="h-4 w-4" />}
            />
          </div>
          <div className="flex items-center gap-1 rounded-xl border border-line bg-surface-base p-1 self-start sm:self-auto">
            {filterLabels.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-xs font-medium transition-all flex items-center gap-1.5',
                  filter === key
                    ? 'bg-surface-raised text-gold shadow-sm'
                    : 'text-ink-subtle hover:text-ink-muted',
                )}
              >
                {label}
                {key === 'discover' && discoverCount > 0 && (
                  <span className={cn(
                    'rounded-full px-1.5 py-0.5 text-[9px] font-bold leading-none',
                    filter === 'discover' ? 'bg-gold/20 text-gold' : 'bg-surface-elevated text-ink-subtle',
                  )}>
                    {discoverCount}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Cards grid */}
        {filtered.length === 0 ? (
          <EmptyState
            hasSearch={search.trim().length > 0}
            filter={filter}
            onJoin={() => setJoinOpen(true)}
            onDiscover={openDiscover}
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
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

      {/* ── Fair Play ──────────────────────────────────────────────── */}
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
    <div className="flex items-center gap-3 rounded-xl border border-line bg-surface-raised px-4 py-3">
      <div className={cn('flex h-9 w-9 items-center justify-center rounded-lg', tint)}>
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="text-lg font-bold leading-none text-ink tabular-nums">{value}</p>
        <p className="mt-1 text-[11px] uppercase tracking-wide text-ink-subtle">{label}</p>
      </div>
    </div>
  )
}

// ─── Action Card ──────────────────────────────────────────────────────────────

interface ActionCardProps {
  href?:      string
  onClick?:   () => void
  icon:       React.ReactNode
  label:      string
  desc:       string
  accent?:    'gold' | 'default'
  className?: string
}

function ActionCard({ href, onClick, icon, label, desc, accent = 'default', className }: ActionCardProps) {
  const base = cn(
    'glossy flex flex-col gap-2 sm:gap-2.5 rounded-xl border p-3 sm:p-4 transition-all duration-150',
    'active:scale-[0.97] cursor-pointer select-none text-left',
    accent === 'gold'
      ? 'border-gold/40 bg-gold/8 hover:bg-gold/12 hover:border-gold/60 hover:shadow-gold'
      : 'border-line bg-surface-raised hover:border-gold/30 hover:bg-surface-elevated',
    className,
  )

  const content = (
    <>
      <div className={cn(
        'flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-lg border',
        accent === 'gold'
          ? 'border-gold/40 bg-gold/15 text-gold'
          : 'border-line bg-surface-elevated text-ink-muted',
      )}>
        {icon}
      </div>
      <div>
        <p className={cn(
          'text-sm font-semibold leading-tight',
          accent === 'gold' ? 'text-gold' : 'text-ink',
        )}>
          {label}
        </p>
        <p className="text-xs text-ink-subtle mt-0.5">{desc}</p>
      </div>
    </>
  )

  if (href) return <Link href={href} className={base}>{content}</Link>
  return <button type="button" onClick={onClick} className={base}>{content}</button>
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({ hasSearch, filter, onJoin, onDiscover }: {
  hasSearch:   boolean
  filter:      FilterKey
  onJoin:      () => void
  onDiscover:  () => void
}) {
  if (hasSearch) return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-line bg-surface-raised py-10 text-center">
      <Search className="h-8 w-8 text-ink-subtle/40" />
      <p className="text-sm text-ink-muted">No tournaments match your search.</p>
    </div>
  )

  if (filter === 'discover') return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-line bg-surface-raised py-10 text-center">
      <Trophy className="h-8 w-8 text-ink-subtle/40" />
      <p className="text-sm text-ink-muted">No open public tournaments right now.</p>
      <Button variant="secondary" size="sm" onClick={onJoin} className="gap-1.5">
        <LogIn className="h-4 w-4" />
        Join with invite code
      </Button>
    </div>
  )

  if (filter === 'active') return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-line bg-surface-raised py-10 text-center">
      <Filter className="h-8 w-8 text-ink-subtle/40" />
      <p className="text-sm text-ink-muted">No active tournaments right now.</p>
      <button onClick={onDiscover} className="text-xs text-gold hover:text-gold/80 transition-colors">
        Browse open tournaments →
      </button>
    </div>
  )

  return (
    <div className="flex flex-col items-center gap-4 rounded-xl border border-line bg-surface-raised py-10 text-center">
      <Trophy className="h-10 w-10 text-gold/30" />
      <div>
        <p className="text-sm font-semibold text-ink">No tournaments yet</p>
        <p className="mt-1 text-xs text-ink-muted">Create one, join with a code, or discover open tournaments.</p>
      </div>
      <div className="flex items-center gap-2 flex-wrap justify-center">
        <Button variant="secondary" size="sm" onClick={onJoin} className="gap-1.5">
          <LogIn className="h-4 w-4" />
          Join with code
        </Button>
        <Button variant="secondary" size="sm" onClick={onDiscover} className="gap-1.5">
          <Search className="h-4 w-4" />
          Discover
        </Button>
        <Button asChild size="sm" className="gap-1.5">
          <Link href="/tournaments/new">
            <Plus className="h-4 w-4" />
            Create
          </Link>
        </Button>
      </div>
    </div>
  )
}
