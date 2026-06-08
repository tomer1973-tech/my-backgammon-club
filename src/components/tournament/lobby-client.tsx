'use client'

import { useState, useMemo }  from 'react'
import Link                   from 'next/link'
import {
  Plus, LogIn, Search, Trophy, Filter,
  Zap, ChevronRight, Users, BarChart2,
} from 'lucide-react'
import { Button }             from '@/components/ui/button'
import { Input }              from '@/components/ui/input'
import { TournamentCard }     from './tournament-card'
import { JoinDialog }         from './join-dialog'
import { archiveTournament }  from '@/actions/tournament'
import { cn }                 from '@/lib/utils'
import type { Tournament }    from '@/types'

type FilterKey = 'all' | 'mine' | 'active'

interface LobbyClientProps {
  initialTournaments: Tournament[]
}

export function LobbyClient({ initialTournaments }: LobbyClientProps) {
  const [tournaments, setTournaments] = useState<Tournament[]>(initialTournaments)
  const [search, setSearch]           = useState('')
  const [filter, setFilter]           = useState<FilterKey>('all')
  const [joinOpen, setJoinOpen]       = useState(false)

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

  return (
    <div className="flex flex-col gap-6 animate-fade-in">

      {/* ── Page title ────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold text-ink">Home</h1>
        <p className="text-sm text-ink-muted mt-0.5">What do you want to do today?</p>
      </div>

      {/* ── Quick Game hero ────────────────────────────────────────────── */}
      <Link
        href="/quick-game"
        className="group relative overflow-hidden rounded-2xl border border-gold/30
          bg-surface-raised p-6 flex items-center gap-5
          hover:border-gold/60 hover:shadow-gold transition-all duration-200
          active:scale-[0.99]"
      >
        {/* Background glow */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0
            bg-[radial-gradient(ellipse_70%_120%_at_0%_50%,hsl(var(--gold)/0.10),transparent)]
            group-hover:opacity-150 transition-opacity"
        />

        {/* Dice icon */}
        <div className="relative shrink-0 flex h-16 w-16 items-center justify-center
          rounded-2xl border border-gold/30 bg-gold/10 text-4xl
          shadow-[0_0_20px_hsl(var(--gold)/0.15)] group-hover:shadow-[0_0_28px_hsl(var(--gold)/0.25)]
          transition-shadow">
          🎲
        </div>

        {/* Text */}
        <div className="relative flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-ink">Quick Game</span>
            <span className="rounded-full bg-gold/15 border border-gold/25 px-2 py-0.5
              text-[10px] font-semibold text-gold tracking-wide">
              FREE
            </span>
          </div>
          <p className="mt-0.5 text-sm text-ink-muted">
            Add players &amp; start scoring — no account needed
          </p>
          <p className="mt-2 flex items-center gap-1 text-xs font-semibold text-gold">
            <Zap className="h-3.5 w-3.5" />
            Play right now
          </p>
        </div>

        {/* Arrow */}
        <ChevronRight className="relative h-5 w-5 shrink-0 text-gold/60
          group-hover:text-gold group-hover:translate-x-0.5 transition-all" />
      </Link>

      {/* ── Action buttons ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
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
          label="Join by Code"
          desc="Enter invite code"
          accent="default"
        />
        <ActionCard
          href="/stats"
          icon={<BarChart2 className="h-5 w-5" />}
          label="My Stats"
          desc="View your record"
          accent="default"
          className="hidden sm:flex"
        />
      </div>

      {/* ── Tournaments section ─────────────────────────────────────────── */}
      <div className="flex flex-col gap-4">
        {/* Section header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-gold" />
            <h2 className="text-base font-semibold text-ink">Tournaments</h2>
            {activeCount > 0 && (
              <span className="rounded-full bg-win/15 border border-win/25 px-2 py-0.5
                text-[10px] font-semibold text-win">
                {activeCount} active
              </span>
            )}
          </div>
          <span className="text-xs text-ink-subtle">
            {tournaments.filter(t => !t.deletedAt).length} total
          </span>
        </div>

        {/* Search + filter row */}
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

        {/* Grid */}
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

      <JoinDialog open={joinOpen} onClose={() => setJoinOpen(false)} />
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
    'flex flex-col gap-3 rounded-xl border p-4 transition-all duration-150',
    'active:scale-[0.98] cursor-pointer select-none',
    accent === 'gold'
      ? 'border-gold/30 bg-gold/5 hover:bg-gold/10 hover:border-gold/50 hover:shadow-gold'
      : 'border-line bg-surface-raised hover:border-gold/30 hover:bg-surface-elevated',
    className,
  )

  const content = (
    <>
      <div className={cn(
        'flex h-9 w-9 items-center justify-center rounded-lg border',
        accent === 'gold'
          ? 'border-gold/30 bg-gold/10 text-gold'
          : 'border-line bg-surface-elevated text-ink-muted',
      )}>
        {icon}
      </div>
      <div>
        <p className={cn(
          'text-sm font-semibold',
          accent === 'gold' ? 'text-gold' : 'text-ink',
        )}>
          {label}
        </p>
        <p className="text-xs text-ink-subtle mt-0.5">{desc}</p>
      </div>
    </>
  )

  if (href) {
    return <Link href={href} className={base}>{content}</Link>
  }
  return <button type="button" onClick={onClick} className={base}>{content}</button>
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({
  hasSearch, filter, onJoin,
}: {
  hasSearch: boolean
  filter:    FilterKey
  onJoin:    () => void
}) {
  if (hasSearch) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-line
        bg-surface-raised py-12 text-center">
        <Search className="h-8 w-8 text-ink-subtle/40" />
        <p className="text-sm text-ink-muted">No tournaments match your search.</p>
      </div>
    )
  }
  if (filter !== 'all') {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-line
        bg-surface-raised py-12 text-center">
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
  }
  return (
    <div className="flex flex-col items-center gap-4 rounded-xl border border-line
      bg-surface-raised py-12 text-center">
      <Trophy className="h-10 w-10 text-gold/30" />
      <div>
        <p className="text-sm font-semibold text-ink">No tournaments yet</p>
        <p className="mt-1 text-xs text-ink-muted">
          Create your first or join one with a code.
        </p>
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
