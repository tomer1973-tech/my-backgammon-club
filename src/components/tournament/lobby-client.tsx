'use client'

/**
 * LobbyClient — interactive tournament lobby.
 *
 * Features:
 *  - Search/filter by name
 *  - Filter by status (All / Mine / Active)
 *  - Create tournament button → wizard page
 *  - Join tournament by code dialog
 *  - Tournament cards with delete/archive actions
 */

import { useState, useMemo }     from 'react'
import Link                      from 'next/link'
import { Plus, LogIn, Search, Trophy, Filter, Zap } from 'lucide-react'
import { Button }                from '@/components/ui/button'
import { Input }                 from '@/components/ui/input'
import { TournamentCard }        from './tournament-card'
import { JoinDialog }            from './join-dialog'
import { archiveTournament }     from '@/actions/tournament'
import { cn }                    from '@/lib/utils'
import type { Tournament }       from '@/types'

type Filter = 'all' | 'mine' | 'active'

interface LobbyClientProps {
  initialTournaments: Tournament[]
}

export function LobbyClient({ initialTournaments }: LobbyClientProps) {
  const [tournaments, setTournaments] = useState<Tournament[]>(initialTournaments)
  const [search, setSearch]           = useState('')
  const [filter, setFilter]           = useState<Filter>('all')
  const [joinOpen, setJoinOpen]       = useState(false)

  // Optimistically remove a deleted tournament from the list
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
        // 'all' hides archived unless they belong to user
        if (t.status === 'ARCHIVED') return t.isMember || t.isOwner
        return true
      })
      .filter(t =>
        search.trim() === '' ||
        t.name.toLowerCase().includes(search.toLowerCase()) ||
        (t.location ?? '').toLowerCase().includes(search.toLowerCase()),
      )
  }, [tournaments, filter, search])

  const filterLabels: { key: Filter; label: string }[] = [
    { key: 'all',    label: 'All' },
    { key: 'mine',   label: 'My tournaments' },
    { key: 'active', label: 'Active' },
  ]

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      {/* Page header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink">Lobby</h1>
          <p className="text-sm text-ink-muted mt-0.5">
            {tournaments.filter(t => !t.deletedAt).length} tournament{tournaments.filter(t => !t.deletedAt).length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setJoinOpen(true)}
            className="gap-1.5 border border-line hover:border-gold/40"
          >
            <LogIn className="h-4 w-4" />
            Join
          </Button>
          <Button asChild size="sm" className="gap-1.5 shadow-gold">
            <Link href="/tournaments/new">
              <Plus className="h-4 w-4" />
              New tournament
            </Link>
          </Button>
        </div>
      </div>

      {/* Quick Game CTA banner */}
      <div className="relative overflow-hidden rounded-2xl border border-gold/25 bg-surface-raised
        flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5">
        {/* Ambient glow */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0
            bg-[radial-gradient(ellipse_60%_100%_at_0%_50%,hsl(var(--gold)/0.07),transparent)]"
        />
        <div className="relative flex items-center gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl
            border border-gold/30 bg-gold/10 text-2xl shadow-gold">
            🎲
          </div>
          <div>
            <h3 className="font-semibold text-ink leading-tight">Quick Game</h3>
            <p className="text-xs text-ink-muted mt-0.5">
              Instant scoring for any number of players — no account needed
            </p>
          </div>
        </div>
        <Button asChild className="relative shrink-0 gap-2 shadow-gold" size="sm">
          <Link href="/quick-game">
            <Zap className="h-3.5 w-3.5" />
            Play Now
          </Link>
        </Button>
      </div>

      {/* Search + filter row */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex-1">
          <Input
            name="search"
            placeholder="Search tournaments…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            leading={<Search className="h-4 w-4" />}
          />
        </div>
        <div className="flex items-center gap-1 rounded-xl border border-line bg-surface-base p-1">
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
        <div className="grid gap-4 sm:grid-cols-2">
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

      <JoinDialog open={joinOpen} onClose={() => setJoinOpen(false)} />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// EMPTY STATE
// ─────────────────────────────────────────────────────────────────────────────

function EmptyState({
  hasSearch,
  filter,
  onJoin,
}: {
  hasSearch: boolean
  filter:    Filter
  onJoin:    () => void
}) {
  if (hasSearch) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-line bg-surface-raised py-16 text-center">
        <Search className="h-10 w-10 text-ink-subtle/40" />
        <p className="text-sm text-ink-muted">No tournaments match your search.</p>
      </div>
    )
  }
  if (filter !== 'all') {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-line bg-surface-raised py-16 text-center">
        <Filter className="h-10 w-10 text-ink-subtle/40" />
        <p className="text-sm text-ink-muted">
          {filter === 'mine' ? 'You haven\'t joined any tournaments yet.' : 'No active tournaments right now.'}
        </p>
        <Button variant="secondary" size="sm" onClick={onJoin}>
          Join a tournament
        </Button>
      </div>
    )
  }
  return (
    <div className="flex flex-col items-center gap-4 rounded-xl border border-line bg-surface-raised py-16 text-center">
      <Trophy className="h-12 w-12 text-gold/30" />
      <div>
        <p className="text-base font-semibold text-ink">No tournaments yet</p>
        <p className="mt-1 text-sm text-ink-muted">Create your first tournament or join one with a code.</p>
      </div>
      <div className="flex items-center gap-3">
        <Button variant="secondary" size="sm" onClick={onJoin} className="gap-1.5">
          <LogIn className="h-4 w-4" />
          Join with code
        </Button>
        <Button asChild size="sm" className="gap-1.5">
          <Link href="/tournaments/new">
            <Plus className="h-4 w-4" />
            Create tournament
          </Link>
        </Button>
      </div>
    </div>
  )
}
