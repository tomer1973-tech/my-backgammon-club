import { OpeningChart }  from './charts/opening-chart'
import { SafeSection }   from '@/components/ui/error-boundary'
import type { OpeningStats } from '@/lib/analytics'

interface OpeningTrendsProps {
  stats: OpeningStats[]
}

export function OpeningTrendsSection({ stats }: OpeningTrendsProps) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-subtle">
          Opening trends
        </h2>
        {stats.length > 0 && (
          <span className="text-xs text-ink-muted">{stats.length} type{stats.length !== 1 ? 's' : ''} recorded</span>
        )}
      </div>

      <div className="rounded-xl border border-line bg-surface-raised p-4">
        <SafeSection label="opening chart">
          <OpeningChart data={stats} />
        </SafeSection>


        {stats.length > 0 && (
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {stats.slice(0, 6).map(s => (
              <div key={s.opening} className="rounded-lg bg-surface px-3 py-2">
                <p className="truncate text-xs font-medium text-ink">{s.label}</p>
                <div className="mt-0.5 flex items-center justify-between">
                  <span className="text-xs text-ink-muted">{s.count} match{s.count !== 1 ? 'es' : ''}</span>
                  <span className="text-xs font-semibold text-gold">{s.winRate}% WR</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
