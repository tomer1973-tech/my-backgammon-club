/**
 * /leaderboard — Platform-wide top players
 */

import type { Metadata }   from 'next'
import { Trophy }          from 'lucide-react'
import { getLeaderboard, getRatedLeaderboard } from '@/actions/admin'
import { LeaderboardTabs } from '@/components/leaderboard/leaderboard-tabs'

export const metadata: Metadata = { title: 'Leaderboard — My Backgammon Club' }
export const revalidate = 60

export default async function LeaderboardPage() {
  const [tournamentPlayers, ratedPlayers] = await Promise.all([
    getLeaderboard(20),
    getRatedLeaderboard(20),
  ])

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-ink">
          <Trophy className="h-6 w-6 text-gold" />
          Leaderboard
        </h1>
        <p className="mt-0.5 text-sm text-ink-muted">Top players across ranked matches and tournaments</p>
      </div>

      <LeaderboardTabs tournamentPlayers={tournamentPlayers} ratedPlayers={ratedPlayers} />
    </div>
  )
}
