'use client'

import { WinLossChart }  from './charts/win-loss-chart'
import { StatCard }      from './stat-card'
import { SafeSection }   from '@/components/ui/error-boundary'
import { cn }            from '@/lib/utils'
import type { PlayerAnalyticsData } from '@/actions/analytics'

interface PlayerAnalyticsProps {
  data: PlayerAnalyticsData
}

export function PlayerAnalyticsView({ data }: PlayerAnalyticsProps) {
  const { analytics: a, winRateChart } = data

  const hasMatches = a.totalMatches > 0

  return (
    <div className="flex flex-col gap-8">
      {/* Core stats */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-subtle">
          Performance overview
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard
            label="Matches"
            value={a.totalMatches}
            subtext={`${a.wins}W · ${a.losses}L`}
          />
          <StatCard
            label="Win rate"
            value={`${a.winRate}%`}
            accent={a.winRate >= 60 ? 'win' : a.winRate <= 35 ? 'loss' : 'default'}
          />
          <StatCard
            label="Points"
            value={a.tournamentPoints}
            accent="gold"
            subtext={a.wins > 0 ? `${a.avgPointsPerMatch} per win` : undefined}
          />
          <StatCard
            label="Avg duration"
            value={a.avgMatchDuration > 0 ? `${a.avgMatchDuration}m` : '—'}
            subtext={a.avgMatchDuration > 0 ? 'per match' : 'no data'}
          />
        </div>
      </section>

      {/* Streak */}
      {hasMatches && (
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-subtle">
            Streaks
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-line bg-surface-raised p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-ink-subtle">
                Current streak
              </p>
              {a.currentStreak.type ? (
                <>
                  <p className={cn(
                    'mt-2 text-3xl font-black tabular-nums',
                    a.currentStreak.type === 'win' ? 'text-win' : 'text-loss',
                  )}>
                    {a.currentStreak.count}
                  </p>
                  <p className={cn(
                    'text-xs',
                    a.currentStreak.type === 'win' ? 'text-win' : 'text-loss',
                  )}>
                    {a.currentStreak.type === 'win' ? 'win streak' : 'losing streak'}
                  </p>
                </>
              ) : (
                <p className="mt-2 text-2xl font-black text-ink-muted">—</p>
              )}
            </div>
            <div className="rounded-xl border border-line bg-surface-raised p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-ink-subtle">
                Best win streak
              </p>
              <p className="mt-2 text-3xl font-black tabular-nums text-gold">
                {a.bestWinStreak}
              </p>
              <p className="text-xs text-ink-muted">all time</p>
            </div>
          </div>
        </section>
      )}

      {/* Win rate chart */}
      {winRateChart.length >= 2 && (
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-subtle">
            Win rate over time
          </h2>
          <div className="rounded-xl border border-line bg-surface-raised p-4">
            <SafeSection label="win rate chart">
              <WinLossChart data={winRateChart} />
            </SafeSection>
          </div>
        </section>
      )}

      {/* Game-level stats */}
      {a.totalGames > 0 && (
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-subtle">
            Game statistics
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label="Total games"     value={a.totalGames} />
            <StatCard label="Cube usage"      value={`${a.cubeUsageRate}%`}     accent="gold" />
            <StatCard label="Gammon rate"     value={`${a.gammonRate}%`}        />
            <StatCard label="Backgammon rate" value={`${a.backgammonRate}%`}    />
          </div>
          {a.closeMatchRate > 0 && (
            <p className="text-xs text-ink-subtle text-center">
              {a.closeMatchRate}% of matches were close (decided by ≤ 2 pts)
            </p>
          )}
        </section>
      )}

      {/* Opening performance */}
      {a.openingPerformance.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-subtle">
            Opening performance
          </h2>
          <div className="rounded-xl border border-line bg-surface-raised overflow-hidden overflow-x-auto">
            <table className="w-full min-w-[340px] text-sm">
              <thead>
                <tr className="border-b border-line">
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-ink-subtle">Opening</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-ink-subtle">Played</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-ink-subtle">W–L</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-ink-subtle">Win%</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {a.openingPerformance.map(op => (
                  <tr key={op.opening} className="transition-colors hover:bg-surface">
                    <td className="px-4 py-3 font-medium text-ink">{op.label}</td>
                    <td className="px-4 py-3 text-right text-ink-muted">{op.total}</td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-win">{op.wins}</span>
                      <span className="text-ink-subtle">–</span>
                      <span className="text-loss">{op.total - op.wins}</span>
                    </td>
                    <td className={cn(
                      'px-4 py-3 text-right font-semibold tabular-nums',
                      op.rate >= 60 ? 'text-win' : op.rate <= 35 ? 'text-loss' : 'text-gold',
                    )}>
                      {op.rate}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Head to head */}
      {a.headToHead.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-subtle">
            Head to head
          </h2>
          <div className="rounded-xl border border-line bg-surface-raised overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line">
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-ink-subtle">Opponent</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-ink-subtle">W–L</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-ink-subtle">Win%</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {a.headToHead.map(h => (
                  <tr key={h.opponentId} className="transition-colors hover:bg-surface">
                    <td className="px-4 py-3 font-medium text-ink">{h.opponentName}</td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-win">{h.wins}</span>
                      <span className="text-ink-subtle">–</span>
                      <span className="text-loss">{h.losses}</span>
                    </td>
                    <td className={cn(
                      'px-4 py-3 text-right font-semibold tabular-nums',
                      h.winRate >= 60 ? 'text-win' : h.winRate <= 35 ? 'text-loss' : 'text-gold',
                    )}>
                      {h.winRate}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Match timeline */}
      {a.timeline.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-subtle">
            Match history
          </h2>
          <div className="space-y-2">
            {[...a.timeline].reverse().map(t => (
              <div
                key={t.matchNumber}
                className="flex items-center justify-between rounded-lg border border-line bg-surface-raised px-4 py-2.5"
              >
                <div className="flex items-center gap-3">
                  <span className={cn(
                    'flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold',
                    t.win ? 'bg-win/15 text-win' : 'bg-loss/15 text-loss',
                  )}>
                    {t.win ? 'W' : 'L'}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-ink">vs. {t.opponentName}</p>
                    <p className="text-xs text-ink-muted">{t.date}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold tabular-nums text-ink">{t.score}</p>
                  <p className="text-xs text-ink-muted">Match #{t.matchNumber}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {!hasMatches && (
        <div className="rounded-xl border border-line bg-surface-raised py-12 text-center">
          <p className="text-sm font-medium text-ink">No completed matches yet</p>
          <p className="mt-1 text-sm text-ink-muted">
            Stats will appear once matches are completed.
          </p>
        </div>
      )}
    </div>
  )
}
