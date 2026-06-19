'use client'

import { useState, useMemo }  from 'react'
import Link                   from 'next/link'
import {
  Plus, LogIn, Search, Trophy, Filter,
  Zap, ChevronRight, Users, BarChart2, Settings, Bot, GraduationCap,
} from 'lucide-react'
import { Button }              from '@/components/ui/button'
import { Input }               from '@/components/ui/input'
import { TournamentCard }      from './tournament-card'
import { JoinDialog }          from './join-dialog'
import { QuickMatchDialog }    from '@/components/quick-game/quick-match-dialog'
import { archiveTournament }   from '@/actions/tournament'
import { cn }                  from '@/lib/utils'
import type { Tournament, SessionUser } from '@/types'

type FilterKey = 'all' | 'mine' | 'active'

interface LobbyClientProps {
  initialTournaments: Tournament[]
  currentUser:        SessionUser | null
}

export function LobbyClient({ initialTournaments, currentUser }: LobbyClientProps) {
  const [tournaments, setTournaments]       = useState<Tournament[]>(initialTournaments)
  const [search, setSearch]                 = useState('')
  const [filter, setFilter]                 = useState<FilterKey>('all')
  const [joinOpen, setJoinOpen]             = useState(false)
  const [quickMatchOpen, setQuickMatchOpen] = useState(false)

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

  const filtered = useMemo(() => {
    return tournaments
      .filter(t => t.deletedAt === null)
      .filter(t => {
        if (filter === 'mine')   return t.isMember || t.isOwner
        if (filter === 'active') return t.status === 'ACTIVE'
        if (t.status === 'ARCHIVED') return t.isMember || t.isOwner
        return true
      })
      .filter(t =>
        search.trim() === '' ||
        t.name.toLowerCase().includes(search.toLowerCase()) ||
        (t.location ?? '').toLowerCase().includes(search.toLowerCase()),
      )
  }, [tournaments, filter, search])

  const filterLabels: { key: FilterKey; label: string }[] = [
    { key: 'all',    label: 'All' },
    { key: 'mine',   label: 'Mine' },
    { key: 'active', label: 'Active' },
  ]

  const activeCount = tournaments.filter(t => !t.deletedAt && t.status === 'ACTIVE').length
  const totalCount  = tournaments.filter(t => !t.deletedAt).length

  return (
    <div className="flex flex-col gap-6 animate-fade-in">

      {/* ── Greeting header ────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-ink">
            Welcome{currentUser ? `, ${currentUser.name.split(' ')[0]}` : ''} 👋
          </h1>
          <p className="text-sm text-ink-muted mt-0.5">
            {activeCount > 0
              ? `You have ${activeCount} active tournament${activeCount > 1 ? 's' : ''}`
              : 'Ready to play? Start a quick game or manage your tournaments.'}
          </p>
        </div>
        <Link
          href="/settings"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-line
            bg-surface-raised text-ink-muted hover:text-ink hover:border-gold/30 transition-all"
        >
          <Settings className="h-4 w-4" />
        </Link>
      </div>

      {/* ── QUICK MATCH — big hero button ──────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl border-2 border-gold/40 bg-surface-raised">
        {/* Animated gold glow background */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0
            bg-[radial-gradient(ellipse_80%_100%_at_50%_0%,hsl(var(--gold)/0.12),transparent)]"
        />

        <div className="relative p-4 sm:p-6">
          {/* Label */}
          <div className="flex items-center gap-2 mb-1">
            <Zap className="h-4 w-4 text-gold" />
            <span className="text-xs font-bold uppercase tracking-widest text-gold">Quick Match</span>
            <span className="rounded-full bg-gold/20 border border-gold/30 px-2 py-0.5 text-[10px] font-bold text-gold">
              FREE
            </span>
          </div>

          {/* Headline */}
          <h2 className="text-xl sm:text-2xl font-bold text-ink mt-1">
            Start a game right now
          </h2>
          <p className="text-sm text-ink-muted mt-1 mb-4 sm:mb-5">
            Add players from your club or as guests, choose a race-to, and start scoring instantly.
          </p>

          {/* CTA buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={() => setQuickMatchOpen(true)}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl
                bg-gold text-black font-bold text-sm sm:text-base py-3 sm:py-3.5 px-6
                hover:bg-gold/90 active:scale-[0.98] transition-all
                shadow-[0_4px_20px_hsl(var(--gold)/0.35)]"
            >
              <Users className="h-5 w-5" />
              Add Players &amp; Start
            </button>
            <Link
              href="/quick-game"
              className="flex items-center justify-center gap-2 rounded-xl
                border-2 border-gold/40 bg-gold/10 hover:bg-gold/20
                text-gold font-semibold text-sm py-3 sm:py-3.5 px-5
                active:scale-[0.98] transition-all"
            >
              <Zap className="h-4 w-4" />
              Quick Start
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>

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
          href="/players"
          icon={<Users className="h-5 w-5" />}
          label="Players"
          desc="View & add players"
        />
        <ActionCard
          href="/stats"
          icon={<BarChart2 className="h-5 w-5" />}
          label="My Stats"
          desc="Your record"
        />
      </div>

      {/* ── Tournaments section ─────────────────────────────────────── */}
      <div className="flex flex-col gap-4">

        {/* Section header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-gold" />
            <h2 className="text-base font-semibold text-ink">My Tournaments</h2>
            {activeCount > 0 && (
              <span className="rounded-full bg-win/15 border border-win/25 px-2 py-0.5
                text-[10px] font-semibold text-win">
                {activeCount} active
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-ink-subtle">{totalCount} total</span>
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
                  'rounded-lg px-3 py-1.5 text-xs font-medium transition-all',
                  filter === key
                    ? 'bg-surface-raised text-gold shadow-sm'
                    : 'text-ink-subtle hover:text-ink-muted',
                )}
              >
                {label}
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
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {filtered.map(t => (
              <TournamentCard
                key={t.id}
                tournament={t}
                onDelete={handleDelete}
                onArchive={handleArchive}
              />
            ))}
          </div>
        )}
      </div>

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
    'flex flex-col gap-2 sm:gap-2.5 rounded-xl border p-3 sm:p-4 transition-all duration-150',
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

function EmptyState({ hasSearch, filter, onJoin }: {
  hasSearch: boolean
  filter:    FilterKey
  onJoin:    () => void
}) {
  if (hasSearch) return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-line bg-surface-raised py-10 text-center">
      <Search className="h-8 w-8 text-ink-subtle/40" />
      <p className="text-sm text-ink-muted">No tournaments match your search.</p>
    </div>
  )

  if (filter !== 'all') return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-line bg-surface-raised py-10 text-center">
      <Filter className="h-8 w-8 text-ink-subtle/40" />
      <p className="text-sm text-ink-muted">
        {filter === 'mine' ? "You haven't joined any tournaments yet." : 'No active tournaments right now.'}
      </p>
      <Button variant="secondary" size="sm" onClick={onJoin} className="gap-1.5">
        <LogIn className="h-4 w-4" />
        Join a tournament
      </Button>
    </div>
  )

  return (
    <div className="flex flex-col items-center gap-4 rounded-xl border border-line bg-surface-raised py-10 text-center">
      <Trophy className="h-10 w-10 text-gold/30" />
      <div>
        <p className="text-sm font-semibold text-ink">No tournaments yet</p>
        <p className="mt-1 text-xs text-ink-muted">Create one or join with a code.</p>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="secondary" size="sm" onClick={onJoin} className="gap-1.5">
          <LogIn className="h-4 w-4" />
          Join with code
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
