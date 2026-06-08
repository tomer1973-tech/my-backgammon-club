/**
 * /stats — My Stats
 *
 * Cross-tournament personal statistics for the logged-in player.
 * Server Component — data fetched at request time.
 */

import type { Metadata }     from 'next'
import Link                  from 'next/link'
import { BarChart2, Trophy, Swords, TrendingUp, Star } from 'lucide-react'
import { getMyStats }        from '@/actions/stats'
import { getSessionUser }    from '@/lib/session'
import { TOURNAMENT_FORMAT_LABEL, TOURNAMENT_STATUS_LABEL } from '@/types'
import { cn }                from '@/lib/utils'

export const metadata: Metadata = { title: 'My Stats — My Backgammon Club' }
export const dynamic = 'force-dynamic'

// ── Stat card helper ──────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  accent,
}: {
  label:   string
  value:   string | number
  sub?:    string
  icon:    React.ElementType
  accent?: boolean
}) {
  return (
    <div className={cn(
      'rounded-xl border bg-surface-raised px-5 py-4 flex items-start gap-4',
      accent ? 'border-line-gold/50 shadow-gold' : 'border-line',
    )}>
      <div className={cn(
        'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
        accent ? 'bg-gold/10' : 'bg-surface-elevated',
      )}>
        <Icon className={cn('h-5 w-5', accent ? 'text-gold' : 'text-ink-muted')} />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-ink-subtle">{label}</p>
        <p className={cn('text-2xl font-bold mt-0.5', accent ? 'text-gold' : 'text-ink')}>
          {value}
        </p>
        {sub && <p className="text-xs text-ink-muted mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

// ── Status badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    DRAFT:     'bg-surface-elevated text-ink-muted border-line',
    ACTIVE:    'bg-win/10 text-win border-win/30',
    COMPLETED: 'bg-gold/10 text-gold border-gold/30',
    ARCHIVED:  'bg-surface-elevated text-ink-subtle border-line',
  }
  return (
    <span className={cn(
      'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium',
      styles[status] ?? styles.DRAFT,
    )}>
      {TOURNAMENT_STATUS_LABEL[status as keyof typeof TOURNAMENT_STATUS_LABEL] ?? status}
    </span>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function StatsPage() {
  const [user, stats] = await Promise.all([
    getSessionUser(),
    getMyStats(),
  ])

  const { totalTournaments, totalMatches, totalWins, totalLosses, totalPoints, winRate, tournamentHistory } = stats

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-ink">
          <BarChart2 className="h-6 w-6 text-gold" />
          My Stats
        </h1>
        <p className="mt-0.5 text-sm text-ink-muted">
          Career stats for {user?.name ?? 'you'} across all tournaments
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          label="Win rate"
          value={`${winRate}%`}
          sub={`${totalWins}W – ${totalLosses}L`}
          icon={TrendingUp}
          accent
        />
        <StatCard
          label="Total matches"
          value={totalMatches}
          sub={totalMatches === 0 ? 'No matches yet' : undefined}
          icon={Swords}
        />
        <StatCard
          label="Total points"
          value={totalPoints}
          icon={Star}
        />
        <StatCard
          label="Tournaments"
          value={totalTournaments}
          icon={Trophy}
        />
      </div>

      {/* Tournament history */}
      <div>
        <h2 className="mb-3 text-sm font-semibold text-ink-muted uppercase tracking-wide">
          Tournament history
        </h2>

        {tournamentHistory.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-line bg-surface-raised py-14 text-center">
            <Trophy className="h-10 w-10 text-ink-subtle/40" />
            <div>
              <p className="text-sm font-medium text-ink">No tournaments yet</p>
              <p className="mt-1 text-xs text-ink-muted">
                Join or create a tournament to start tracking your stats.
              </p>
            </div>
            <Link
              href="/"
              className="mt-1 text-xs text-gold underline underline-offset-2 hover:text-gold-bright"
            >
              Go to lobby
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {tournamentHistory.map(t => {
              const matches = t.wins + t.losses
              return (
                <Link
                  key={t.id}
                  href={`/tournaments/${t.id}`}
                  className="group flex items-center gap-4 rounded-xl border border-line bg-surface-raised px-4 py-3 transition-colors hover:border-line-gold/60 hover:bg-surface-elevated"
                >
                  {/* Rank badge */}
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-elevated text-sm font-bold text-ink-muted group-hover:bg-surface-base">
                    #{t.rank}
                  </div>

                  {/* Name + meta */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-medium text-ink">{t.name}</p>
                      <StatusBadge status={t.status} />
                    </div>
                    <p className="mt-0.5 text-xs text-ink-muted">
                      {TOURNAMENT_FORMAT_LABEL[t.format as keyof typeof TOURNAMENT_FORMAT_LABEL]}
                      &nbsp;·&nbsp;{t.totalMembers} players
                    </p>
                  </div>

                  {/* Stats */}
                  <div className="hidden sm:flex items-center gap-6 text-sm">
                    <div className="text-center">
                      <p className="font-semibold text-ink">{t.winRate}%</p>
                      <p className="text-[10px] text-ink-subtle">win rate</p>
                    </div>
                    <div className="text-center">
                      <p className="font-semibold text-ink">{t.wins}–{t.losses}</p>
                      <p className="text-[10px] text-ink-subtle">W–L</p>
                    </div>
                    <div className="text-center">
                      <p className="font-semibold text-gold">{t.points}</p>
                      <p className="text-[10px] text-ink-subtle">pts</p>
                    </div>
                  </div>

                  {/* Mobile stats row */}
                  <div className="flex sm:hidden flex-col items-end text-xs">
                    <p className="font-semibold text-ink">{t.wins}–{t.losses}</p>
                    <p className="text-ink-subtle">{t.points} pts</p>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
