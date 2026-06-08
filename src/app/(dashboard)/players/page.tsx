/**
 * /players — Platform Roster
 *
 * Lists all registered players with aggregate career stats.
 * Server Component — rendered fresh on every visit.
 */

import type { Metadata } from 'next'
import Link              from 'next/link'
import { Users, Trophy } from 'lucide-react'
import { getAllPlayers }  from '@/actions/stats'
import { getSessionUser } from '@/lib/session'
import { cn }             from '@/lib/utils'
import { Avatar }         from '@/components/ui/avatar'
import { FollowButton }   from '@/components/social/follow-button'

export const metadata: Metadata = { title: 'Players — My Backgammon Club' }
export const dynamic = 'force-dynamic'

// ── Win-rate colour helper ────────────────────────────────────────────────────

function winRateColor(rate: number) {
  if (rate >= 70) return 'text-win'
  if (rate >= 50) return 'text-gold'
  if (rate > 0)   return 'text-ink'
  return 'text-ink-subtle'
}


// ── Page ─────────────────────────────────────────────────────────────────────

export default async function PlayersPage() {
  const [me, players] = await Promise.all([
    getSessionUser(),
    getAllPlayers(),
  ])

  // Sort: most matches first, then alphabetical
  const sorted = [...players].sort((a, b) => {
    if (b.totalMatches !== a.totalMatches) return b.totalMatches - a.totalMatches
    return a.name.localeCompare(b.name)
  })

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-ink">
            <Users className="h-6 w-6 text-gold" />
            Players
          </h1>
          <p className="mt-0.5 text-sm text-ink-muted">
            {players.length} registered {players.length === 1 ? 'player' : 'players'} on the platform
          </p>
        </div>
      </div>

      {/* Column headers (desktop) */}
      <div className="hidden sm:grid grid-cols-[1fr_auto_auto_auto] gap-4 px-4 text-[10px] font-semibold uppercase tracking-wide text-ink-subtle">
        <span>Player</span>
        <span className="w-16 text-center">Tournaments</span>
        <span className="w-16 text-center">W – L</span>
        <span className="w-16 text-center">Win %</span>
      </div>

      {/* Player rows */}
      {sorted.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-line bg-surface-raised py-14 text-center">
          <Users className="h-10 w-10 text-ink-subtle/40" />
          <p className="text-sm text-ink-muted">No players yet.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {sorted.map((p, idx) => {
            const isMe = p.id === me?.id
            return (
              <div
                key={p.id}
                className={cn(
                  'flex items-center gap-3 rounded-xl border px-4 py-3 transition-colors',
                  isMe
                    ? 'border-line-gold/50 bg-gold/5'
                    : 'border-line bg-surface-raised',
                )}
              >
                {/* Rank */}
                <span className="w-5 shrink-0 text-right text-xs font-medium text-ink-subtle">
                  {idx + 1}
                </span>

                {/* Avatar + name */}
                <Link href={`/players/${p.id}`}>
                  <Avatar name={p.name} src={p.avatarUrl}
                    className="ring-1 ring-white/20 ring-offset-1 ring-offset-surface-raised border-none hover:opacity-80 transition-opacity"
                  />
                </Link>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/players/${p.id}`}
                      className={cn('truncate font-medium hover:underline', isMe ? 'text-gold' : 'text-ink')}
                    >
                      {p.name}
                      {isMe && <span className="ml-1 text-xs font-normal text-gold/70">(you)</span>}
                    </Link>
                  </div>
                  <p className="text-xs text-ink-subtle truncate">{p.email}</p>
                </div>

                {/* Stats — desktop */}
                <div className="hidden sm:grid grid-cols-3 gap-4">
                  <div className="w-16 text-center">
                    <div className="flex items-center justify-center gap-1 text-sm font-medium text-ink">
                      <Trophy className="h-3 w-3 text-ink-subtle" />
                      {p.totalTournaments}
                    </div>
                  </div>
                  <div className="w-16 text-center">
                    <p className="text-sm font-medium text-ink">{p.totalWins}–{p.totalLosses}</p>
                  </div>
                  <div className="w-16 text-center">
                    <p className={cn('text-sm font-bold', winRateColor(p.winRate))}>
                      {p.totalMatches > 0 ? `${p.winRate}%` : '—'}
                    </p>
                  </div>
                </div>

                {/* Stats — mobile */}
                <div className="flex sm:hidden flex-col items-end gap-0.5 text-xs">
                  <span className={cn('font-bold', winRateColor(p.winRate))}>
                    {p.totalMatches > 0 ? `${p.winRate}%` : '—'}
                  </span>
                  <span className="text-ink-subtle">{p.totalWins}W {p.totalLosses}L</span>
                </div>

                {/* Follow button — skip self */}
                {!isMe && me && (
                  <FollowButton
                    targetPlayerId={p.id}
                    initialFollowing={p.isFollowing}
                    initialCount={p.followerCount}
                  />
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
