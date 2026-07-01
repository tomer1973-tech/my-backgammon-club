'use client'

/**
 * StatsOverview — interactive client shell for the summary stat cards on
 * /stats. Each card is a button: clicking any of them lazy-loads the
 * cross-tournament analytics breakdown (streaks, cube/gammon rates, opening
 * performance, head-to-head, win-rate-over-time chart) and opens it in a
 * full detail dialog, reusing the same analytics view used for per-tournament
 * player pages.
 */

import { useState } from 'react'
import { TrendingUp, Swords, Star, Trophy, Zap, Target, ChevronRight, BarChart2 } from 'lucide-react'
import { Dialog } from '@/components/ui/dialog'
import { PlayerAnalyticsView } from '@/components/analytics/player-analytics'
import { getMyDetailedStats, type MyDetailedStats } from '@/actions/stats'
import { cn } from '@/lib/utils'

interface StatsOverviewProps {
  winRate:      number
  totalWins:    number
  totalLosses:  number
  totalMatches: number
  totalPoints:  number
  totalTournaments: number
  quickWins:    number
  quickLosses:  number
}

function GadgetCard({
  label, value, sub, icon: Icon, accent, onClick,
}: {
  label:   string
  value:   string | number
  sub?:    string
  icon:    React.ElementType
  accent?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group relative rounded-xl border bg-surface-raised px-5 py-4 flex items-start gap-4 text-left',
        'transition-all hover:-translate-y-0.5 hover:shadow-elevated active:translate-y-0',
        accent ? 'border-line-gold/50 shadow-gold' : 'border-line hover:border-line-gold/40',
      )}
    >
      <div className={cn(
        'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors',
        accent ? 'bg-gold/10' : 'bg-surface-elevated group-hover:bg-gold/10',
      )}>
        <Icon className={cn('h-5 w-5', accent ? 'text-gold' : 'text-ink-muted group-hover:text-gold')} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-ink-subtle">{label}</p>
        <p className={cn('text-2xl font-bold mt-0.5', accent ? 'text-gold' : 'text-ink')}>
          {value}
        </p>
        {sub && <p className="text-xs text-ink-muted mt-0.5">{sub}</p>}
      </div>
      <ChevronRight className="h-4 w-4 text-ink-subtle/0 group-hover:text-ink-subtle shrink-0 mt-1 transition-colors" />
    </button>
  )
}

export function StatsOverview({
  winRate, totalWins, totalLosses, totalMatches, totalPoints,
  totalTournaments, quickWins, quickLosses,
}: StatsOverviewProps) {
  const [open, setOpen]       = useState(false)
  const [loading, setLoading] = useState(false)
  const [detail, setDetail]   = useState<MyDetailedStats | null>(null)
  const [error, setError]     = useState<string | null>(null)

  async function openDetail() {
    setOpen(true)
    if (detail || loading) return
    setLoading(true)
    setError(null)
    try {
      const data = await getMyDetailedStats()
      setDetail(data)
    } catch {
      setError('Could not load the detailed breakdown right now.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <GadgetCard
          label="Win rate"
          value={`${winRate}%`}
          sub={`${totalWins}W – ${totalLosses}L`}
          icon={TrendingUp}
          accent
          onClick={openDetail}
        />
        <GadgetCard
          label="Total matches"
          value={totalMatches}
          sub={totalMatches === 0 ? 'No matches yet' : 'Tap for breakdown'}
          icon={Swords}
          onClick={openDetail}
        />
        <GadgetCard
          label="Total points"
          value={totalPoints}
          icon={Star}
          onClick={openDetail}
        />
        <GadgetCard
          label="Tournaments"
          value={totalTournaments}
          icon={Trophy}
          onClick={openDetail}
        />
      </div>

      {(quickWins + quickLosses) > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 mt-3">
          <GadgetCard
            label="Quick game wins"
            value={quickWins}
            sub={`${quickLosses} losses`}
            icon={Zap}
            onClick={openDetail}
          />
          <GadgetCard
            label="Quick game rate"
            value={quickWins + quickLosses > 0 ? `${Math.round((quickWins / (quickWins + quickLosses)) * 100)}%` : '—'}
            sub={`${quickWins + quickLosses} casual games`}
            icon={Target}
            onClick={openDetail}
          />
        </div>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} title="Performance breakdown" size="lg">
        {loading && (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <BarChart2 className="h-8 w-8 text-gold animate-pulse" />
            <p className="text-sm text-ink-muted">Crunching your match history…</p>
          </div>
        )}
        {error && (
          <p className="rounded-lg border border-loss/40 bg-loss/10 px-3 py-2 text-sm text-loss">
            {error}
          </p>
        )}
        {!loading && !error && detail && <PlayerAnalyticsView data={detail} />}
      </Dialog>
    </>
  )
}
