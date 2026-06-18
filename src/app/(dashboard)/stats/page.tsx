/**
 * /stats — My Stats
 *
 * Cross-tournament personal statistics for the logged-in player.
 * Server Component — data fetched at request time.
 */

import type { Metadata }     from 'next'
import Link                  from 'next/link'
import { BarChart2, Trophy, Swords, TrendingUp, Star, Flame, Target, Zap, Award } from 'lucide-react'
import { getMyStats }        from '@/actions/stats'
import { getSessionUser }    from '@/lib/session'
import { TOURNAMENT_FORMAT_LABEL, TOURNAMENT_STATUS_LABEL } from '@/types'
import { cn }                from '@/lib/utils'

export const metadata: Metadata = { title: 'My Stats — My Backgammon Club' }
export const dynamic = 'force-dynamic'

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({
  label, value, sub, icon: Icon, accent,
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

// ── Activity bar chart (year view) ────────────────────────────────────────────

function ActivityChart({ history }: { history: Array<{ joinedAt: Date; wins: number; losses: number }> }) {
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const currentMonth = new Date().getMonth()

  // Bucket wins+losses by month of joinedAt as proxy for activity
  const counts = Array(12).fill(0)
  for (const t of history) {
    const m = new Date(t.joinedAt).getMonth()
    counts[m] += t.wins + t.losses
  }
  const max = Math.max(...counts, 1)

  return (
    <div className="rounded-xl border border-line bg-surface-raised p-5">
      <div className="flex items-center gap-2 mb-4">
        <BarChart2 className="h-4 w-4 text-gold" />
        <h2 className="text-sm font-semibold text-ink">Activity This Year</h2>
      </div>
      <div className="flex items-end gap-1.5 h-20">
        {months.map((m, i) => {
          const h = Math.max(4, (counts[i] / max) * 72)
          const isCurrent = i === currentMonth
          return (
            <div key={m} className="flex-1 flex flex-col items-center gap-1">
              <div
                className={cn(
                  'w-full rounded-sm transition-all',
                  isCurrent ? 'bg-gold' : counts[i] > 0 ? 'bg-gold/40' : 'bg-surface-elevated',
                )}
                style={{ height: `${h}px` }}
                title={`${counts[i]} match${counts[i] === 1 ? '' : 'es'}`}
              />
              <span className={cn('text-[9px]', isCurrent ? 'text-gold' : 'text-ink-subtle')}>
                {m}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Progress bar ──────────────────────────────────────────────────────────────

function ProgressBar({ label, value, max, icon }: { label: string; value: number; max: number; icon: string }) {
  const pct = Math.min(100, Math.round((value / max) * 100))
  return (
    <div>
      <div className="flex justify-between items-center mb-1.5">
        <span className="text-xs text-ink-muted flex items-center gap-1.5">
          <span>{icon}</span>{label}
        </span>
        <span className="text-xs font-semibold text-ink-muted">{value}/{max}</span>
      </div>
      <div className="h-1.5 rounded-full bg-surface-elevated overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-gold/70 to-gold transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

// ── Achievement badge ─────────────────────────────────────────────────────────

function Achievement({
  icon, name, desc, unlocked,
}: {
  icon: string; name: string; desc: string; unlocked: boolean
}) {
  return (
    <div className={cn(
      'flex items-center gap-3 rounded-xl border p-3 transition-all',
      unlocked ? 'border-gold/30 bg-gold/5' : 'border-line bg-surface-raised opacity-50',
    )}>
      <span className="text-2xl">{icon}</span>
      <div className="min-w-0">
        <p className={cn('text-xs font-semibold', unlocked ? 'text-gold' : 'text-ink-muted')}>{name}</p>
        <p className="text-[10px] text-ink-subtle mt-0.5">{desc}</p>
      </div>
      {unlocked && (
        <Award className="h-4 w-4 text-gold shrink-0 ml-auto" />
      )}
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function StatsPage() {
  const [user, stats] = await Promise.all([
    getSessionUser(),
    getMyStats(),
  ])

  const { totalTournaments, totalMatches, totalWins, totalLosses, totalPoints, winRate, quickWins, quickLosses, tournamentHistory } = stats

  // Streak: count consecutive tournaments (by joinedAt) with at least one win
  let streak = 0
  const sorted = [...tournamentHistory].sort((a, b) => new Date(b.joinedAt).getTime() - new Date(a.joinedAt).getTime())
  for (const t of sorted) {
    if (t.wins > 0) streak++
    else break
  }

  // Monthly goals (targets based on past activity)
  const matchGoal = 10
  const winGoal   = 5

  // Simple achievements
  const achievements = [
    { icon: '🏆', name: 'Tournament Champion',  desc: 'Win a tournament',           unlocked: tournamentHistory.some(t => t.rank === 1) },
    { icon: '⚡', name: 'Sharp Shooter',         desc: 'Win 10 matches',             unlocked: totalWins >= 10 },
    { icon: '🎯', name: 'Consistent Player',     desc: 'Play in 5 tournaments',      unlocked: totalTournaments >= 5 },
    { icon: '🔥', name: 'Hot Streak',            desc: 'Win 3 tournaments in a row', unlocked: streak >= 3 },
    { icon: '💯', name: 'Half Century',          desc: 'Play 50 matches',            unlocked: totalMatches >= 50 },
    { icon: '⭐', name: 'Point Collector',       desc: 'Earn 100 points',            unlocked: totalPoints >= 100 },
  ]

  return (
    <div className="flex flex-col gap-6 animate-fade-in">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-ink">
            <BarChart2 className="h-6 w-6 text-gold" />
            My Stats
          </h1>
          <p className="mt-0.5 text-sm text-ink-muted">
            Career stats for {user?.name ?? 'you'} across all tournaments
          </p>
        </div>
        {streak > 0 && (
          <div className="flex items-center gap-2 rounded-xl border border-orange-700/30 bg-orange-900/10 px-4 py-2">
            <Flame className="h-5 w-5 text-orange-400" />
            <div>
              <p className="text-base font-bold text-orange-400 leading-none">{streak}</p>
              <p className="text-[10px] text-ink-muted">win streak</p>
            </div>
          </div>
        )}
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

      {/* Quick games row */}
      {(quickWins + quickLosses) > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-2">
          <StatCard
            label="Quick game wins"
            value={quickWins}
            sub={`${quickLosses} losses`}
            icon={Zap}
          />
          <StatCard
            label="Quick game rate"
            value={quickWins + quickLosses > 0 ? `${Math.round((quickWins / (quickWins + quickLosses)) * 100)}%` : '—'}
            sub={`${quickWins + quickLosses} casual games`}
            icon={Target}
          />
        </div>
      )}

      {/* Activity chart */}
      <ActivityChart history={tournamentHistory} />

      {/* Goals + Achievements */}
      <div className="grid gap-4 sm:grid-cols-2">

        {/* Monthly goals */}
        <div className="rounded-xl border border-line bg-surface-raised p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-gold" />
            <h2 className="text-sm font-semibold text-ink">Progress Goals</h2>
          </div>
          <ProgressBar label="Matches played"   value={Math.min(totalMatches,    matchGoal * 5)} max={matchGoal * 5} icon="🎮" />
          <ProgressBar label="Wins accumulated"  value={Math.min(totalWins,       winGoal * 5)}   max={winGoal * 5}   icon="🏅" />
          <ProgressBar label="Points earned"     value={Math.min(totalPoints,     500)}           max={500}           icon="⭐" />
          <ProgressBar label="Tournaments joined" value={Math.min(totalTournaments, 20)}           max={20}            icon="🏆" />
        </div>

        {/* Achievements */}
        <div className="rounded-xl border border-line bg-surface-raised p-5">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="h-4 w-4 text-gold" />
            <h2 className="text-sm font-semibold text-ink">Achievements</h2>
            <span className="ml-auto text-xs text-ink-subtle">
              {achievements.filter(a => a.unlocked).length}/{achievements.length}
            </span>
          </div>
          <div className="grid grid-cols-1 gap-2">
            {achievements.map(a => (
              <Achievement key={a.name} {...a} />
            ))}
          </div>
        </div>
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
              return (
                <Link
                  key={t.id}
                  href={`/tournaments/${t.id}`}
                  className="group flex items-center gap-4 rounded-xl border border-line bg-surface-raised px-4 py-3 transition-colors hover:border-line-gold/60 hover:bg-surface-elevated"
                >
                  {/* Rank badge */}
                  <div className={cn(
                    'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold',
                    t.rank === 1 ? 'bg-gold/15 text-gold border border-gold/30' : 'bg-surface-elevated text-ink-muted',
                  )}>
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

                  {/* Mobile stats */}
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
