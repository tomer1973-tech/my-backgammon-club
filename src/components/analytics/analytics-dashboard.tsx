import { TournamentSnapshotSection }  from './tournament-snapshot'
import { MomentumPlayersSection }     from './momentum-players'
import { OpeningTrendsSection }       from './opening-trends'
import { MatchRecommendationCard }    from './match-recommendation'
import type { TournamentAnalyticsData } from '@/actions/analytics'

interface AnalyticsDashboardProps {
  data:          TournamentAnalyticsData
  tournamentId:  string
  canManage:     boolean
}

export function AnalyticsDashboard({
  data,
  tournamentId,
  canManage,
}: AnalyticsDashboardProps) {
  const { snapshot, openingStats, momentumPlayers, recommendation } = data

  return (
    <div className="flex flex-col gap-8">
      {/* Tournament KPIs */}
      <TournamentSnapshotSection snapshot={snapshot} />

      {/* Smart pairing recommendation */}
      <MatchRecommendationCard
        recommendation={recommendation}
        tournamentId={tournamentId}
        canManage={canManage}
      />

      {/* Hot streaks */}
      <MomentumPlayersSection players={momentumPlayers} />

      {/* Opening trends */}
      <OpeningTrendsSection stats={openingStats} />
    </div>
  )
}
