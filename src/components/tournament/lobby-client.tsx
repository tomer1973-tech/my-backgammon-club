'use client'

import { useState, useMemo, useRef } from 'react'
import Link                   from 'next/link'
import {
  Plus, LogIn, Search, Trophy, ChevronRight,
  Settings, Bot, GraduationCap, Play,
  UserPlus2, Swords, TrendingUp, Flame,
  ChevronDown, Users, Globe, Zap, Monitor,
  CalendarDays, Clock,
} from 'lucide-react'
import { Button }              from '@/components/ui/button'
import { Input }               from '@/components/ui/input'
import { TournamentCard }      from './tournament-card'
import { JoinDialog }          from './join-dialog'
import { QuickMatchDialog }    from '@/components/quick-game/quick-match-dialog'
import { FairPlayBanner }      from '@/components/lobby/fair-play-banner'
import { MatchmakingWidget }   from '@/components/lobby/matchmaking-widget'
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
          <h1 className="font-display text-xl font-bold text-ink mt-1">
            {greeting()}{currentUser ? `, ${currentUser.name.split(' ')[0]}` : ''}
          </h1>
        </div>
        <Link
          href="/settings"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-line
            bg-surface-raised text-ink-muted hover:border-gold/30 hover:text-gold transition-all"
          aria-label="Settings"
        >
          <Settings className="h-4 w-4" />
        </Link>
      </div>

      {/* ── Hero card ─────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl border border-line bg-surface-raised shadow-lg min-h-[180px]">
        {/* Board art SVG background */}
        <svg
          className="absolute right-0 top-0 h-full w-[180px] opacity-[0.14] pointer-events-none select-none"
          viewBox="0 0 180 200"
          fill="none"
          aria-hidden="true"
        >
          {[0,30,60,90,120,150].map((x,i) => (
            <polygon key={i} points={`${x+2},0 ${x+18},0 ${x+10},75`} fill="hsl(var(--gold))" opacity={i%2===0?'1':'.6'}/>
          ))}
          {[0,30,60,90,120,150].map((x,i) => (
            <polygon key={i+6} points={`${x+2},200 ${x+18},200 ${x+10},125`} fill="hsl(var(--gold-dim))" opacity={i%2===0?'.8':'.5'}/>
          ))}
          <circle cx="10" cy="100" r="8" fill="hsl(var(--gold))" opacity=".4"/>
          <circle cx="40" cy="100" r="8" fill="hsl(var(--gold))" opacity=".4"/>
          <circle cx="70" cy="100" r="8" fill="hsl(var(--surface-muted))" opacity=".6"/>
          <circle cx="100" cy="100" r="8" fill="hsl(var(--gold))" opacity=".4"/>
          <rect x="82" y="0" width="16" height="200" fill="hsl(var(--gold))" opacity=".03"/>
        </svg>

        {/* Gradient overlay — left side reads clearly */}
        <div className="absolute inset-0 bg-gradient-to-r from-surface-raised via-surface-raised/90 to-transparent pointer-events-none" />

        <div className="relative flex flex-col gap-4 p-5 sm:p-6">
          <div>
            <p className="font-display text-4xl font-black uppercase tracking-tight text-ink leading-none">
              Play<span className="text-gold">.</span>
            </p>
            <p className="mt-2 text-sm text-ink-muted max-w-[180px] leading-snug">
              Start a new game and enjoy Backgammon
            </p>
          </div>

          <div className="flex flex-col gap-2 w-fit">
            <button
              type="button"
              onClick={() => setQuickMatchOpen(true)}
              className="group flex items-center gap-2.5 rounded-full
                bg-gradient-to-b from-gold-bright to-gold
                border border-gold-dim/60 px-6 py-3 text-sm font-bold text-surface-canvas
                shadow-[0_4px_20px_-4px_hsl(var(--gold)/0.55)]
                transition-all hover:to-gold-bright active:scale-[0.97]"
            >
              <Play className="h-4 w-4 fill-current" />
              New Game
            </button>
            <Link
              href="/players"
              className="flex items-center gap-2.5 rounded-full border border-line/70
                bg-white/5 px-5 py-2.5 text-sm font-semibold text-ink
                hover:border-gold/30 transition-colors backdrop-blur"
            >
              <UserPlus2 className="h-4 w-4 text-gold" />
              Quick Match
            </Link>
          </div>
        </div>
      </div>

      {/* ── Section divider ───────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-line" />
        <span className="text-gold text-[10px]">◆</span>
        <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-ink-subtle">Choose your mode</span>
        <span className="text-gold text-[10px]">◆</span>
        <div className="flex-1 h-px bg-line" />
      </div>

      {/* ── Mode grid ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-2.5">
        <ModeCard
          href="/practice"
          icon={<Bot className="h-5 w-5" />}
          name="Play vs AI"
          desc="Play against our smart AI"
          stat="4 Levels"
          statIcon={<TrendingUp className="h-3 w-3" />}
          tint="bg-jade/10 border-jade/15"
          iconTint="bg-jade/15 text-jade"
        />
        <ModeCard
          onClick={() => setQuickMatchOpen(true)}
          icon={<Globe className="h-5 w-5" />}
          name="Online"
          desc="Play real players online"
          stat="1,245 online"
          statIcon={<Users className="h-3 w-3" />}
          tint="bg-[hsl(220_50%_20%/0.3)] border-[hsl(220_50%_40%/0.15)]"
          iconTint="bg-[hsl(220_50%_30%/0.4)] text-[hsl(220_70%_70%)]"
        />
        <ModeCard
          href="/play"
          icon={<Monitor className="h-5 w-5" />}
          name="Local play"
          desc="Play with a friend, same device"
          stat="2 players"
          statIcon={<Users className="h-3 w-3" />}
          tint="bg-[hsl(270_40%_20%/0.3)] border-[hsl(270_40%_50%/0.15)]"
          iconTint="bg-[hsl(270_40%_30%/0.4)] text-[hsl(270_70%_75%)]"
        />
        <ModeCard
          href="/lessons"
          icon={<GraduationCap className="h-5 w-5" />}
          name="Practice"
          desc="Sharpen your skills and learn"
          stat="Training"
          statIcon={<Swords className="h-3 w-3" />}
          tint="bg-gold/8 border-gold/15"
          iconTint="bg-gold/15 text-gold"
        />
      </div>

      {/* ── Daily challenge / ranked matchmaking ─────────────────────── */}
      {currentUser ? (
        <MatchmakingWidget />
      ) : (
        <DailyChallenge />
      )}

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

      {/* ── Recent matches ─────────────────────────────────────────────── */}
      {header && header.recentMatches.length > 0 && (
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-[0.18em] text-ink-subtle">
              <Swords className="h-3.5 w-3.5 text-gold" /> Recent matches
            </h3>
            <Link href="/stats" className="text-xs font-medium text-gold hover:underline">View all</Link>
          </div>
          <div className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface-raised">
            {header.recentMatches.map((m, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3 hover:bg-surface-elevated/60 transition-colors">
                <span className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold',
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

// ─── Mode Card ────────────────────────────────────────────────────────────────

function ModeCard({
  href, onClick, icon, name, desc, stat, statIcon, tint, iconTint,
}: {
  href?: string; onClick?: () => void
  icon: React.ReactNode; name: string; desc: string
  stat: string; statIcon: React.ReactNode
  tint: string; iconTint: string
}) {
  const cls = cn(
    'flex flex-col gap-2.5 rounded-2xl border p-3.5 cursor-pointer select-none',
    'transition-all duration-150 active:scale-[0.97] hover:brightness-110',
    tint,
  )
  const inner = (
    <>
      <div className={cn('flex h-9 w-9 items-center justify-center rounded-xl', iconTint)}>
        {icon}
      </div>
      <div className="flex flex-col gap-1 mt-0.5">
        <p className="text-[11px] font-black uppercase tracking-[0.1em] text-gold leading-none">{name}</p>
        <p className="text-[11px] text-ink-muted leading-snug">{desc}</p>
      </div>
      <div className="flex items-center gap-1.5 text-ink-subtle mt-auto pt-1">
        {statIcon}
        <span className="text-[10px] font-semibold">{stat}</span>
      </div>
    </>
  )
  if (href) return <Link href={href} className={cls}>{inner}</Link>
  return <button type="button" onClick={onClick} className={cls}>{inner}</button>
}

// ─── Daily Challenge placeholder (for logged-out state) ───────────────────────

function DailyChallenge() {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-line bg-surface-raised p-4">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gold/12">
        <CalendarDays className="h-5 w-5 text-gold" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-gold mb-1">Daily Challenge</p>
        <p className="text-sm font-semibold text-ink">Play today's challenge</p>
        <div className="flex items-center gap-1.5 mt-1 text-ink-subtle">
          <Clock className="h-3 w-3" />
          <span className="text-[10px] font-medium">Resets in 14:18:32</span>
        </div>
      </div>
      <button
        type="button"
        className="shrink-0 rounded-full bg-gold px-4 py-2 text-[12px] font-bold text-surface-canvas"
      >
        Play Now
      </button>
    </div>
  )
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
