import { StatCard } from './stat-card'
import { Users, Swords, Trophy, Gamepad2 } from 'lucide-react'
import type { TournamentSnapshot } from '@/lib/analytics'

interface TournamentSnapshotProps {
  snapshot: TournamentSnapshot
}

export function TournamentSnapshotSection({ snapshot }: TournamentSnapshotProps) {
  const completionLabel =
    snapshot.totalPossibleMatches > 0
      ? `${snapshot.completedMatches} of ${snapshot.totalPossibleMatches} possible`
      : 'No matches yet'

  return (
    <section className="space-y-3">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-subtle">
        Tournament snapshot
      </h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          label="Players"
          value={snapshot.totalPlayers}
          icon={<Users className="h-3.5 w-3.5" />}
        />
        <StatCard
          label="Completed"
          value={`${snapshot.completionPct}%`}
          subtext={completionLabel}
          accent="gold"
          icon={<Trophy className="h-3.5 w-3.5" />}
        />
        <StatCard
          label="Live now"
          value={snapshot.activeMatches}
          subtext={snapshot.activeMatches > 0 ? 'matches in progress' : 'no active matches'}
          accent={snapshot.activeMatches > 0 ? 'win' : 'default'}
          icon={<Swords className="h-3.5 w-3.5" />}
        />
        <StatCard
          label="Games played"
          value={snapshot.totalGamesPlayed}
          subtext={
            snapshot.gammonRate > 0
              ? `${snapshot.gammonRate}% gammon rate`
              : undefined
          }
          icon={<Gamepad2 className="h-3.5 w-3.5" />}
        />
      </div>

      {snapshot.avgMatchDurationMin > 0 && (
        <p className="text-xs text-ink-subtle text-center">
          Average match duration: {snapshot.avgMatchDurationMin} min
        </p>
      )}
    </section>
  )
}
