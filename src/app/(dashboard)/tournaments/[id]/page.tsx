import type { Metadata }              from 'next'
import { notFound }                   from 'next/navigation'
import Link                           from 'next/link'
import { ChevronLeft, Users, Swords, Trophy, BarChart2 } from 'lucide-react'
import { getTournamentWithMembers }   from '@/actions/tournament'
import { getTournamentMatches, getStandings } from '@/actions/match'
import { TournamentOverview }         from '@/components/tournament/tournament-overview'
import { PlayerRoster }               from '@/components/players/player-roster'
import { MatchCard }                  from '@/components/match/match-card'
import { StandingsTable }             from '@/components/match/standings-table'
import { getSessionUser }             from '@/lib/session'
import { Button }                     from '@/components/ui/button'

export const dynamic = 'force-dynamic'

interface Props { params: { id: string } }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const t = await getTournamentWithMembers(params.id)
    return { title: `${t.name} — My Backgammon Club` }
  } catch { return { title: 'Tournament — My Backgammon Club' } }
}

export default async function TournamentDetailPage({ params }: Props) {
  let tournament, matches, standings
  try {
    [tournament, matches, standings] = await Promise.all([
      getTournamentWithMembers(params.id),
      getTournamentMatches(params.id),
      getStandings(params.id),
    ])
  } catch { notFound() }

  const user      = await getSessionUser()
  const canManage = tournament.isOwner || tournament.userRole === 'ORGANIZER' || user?.role === 'ADMIN'

  const activeMatches    = matches.filter(m => m.status === 'ACTIVE')
  const recentCompleted  = matches.filter(m => m.status === 'COMPLETED').slice(0, 3)

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      {/* Back nav */}
      <div className="flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-ink-muted hover:text-ink transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          Lobby
        </Link>
        <div className="flex items-center gap-2">
          {canManage && (
            <Button asChild variant="ghost" size="sm" className="gap-1.5">
              <Link href={`/tournaments/${tournament.id}/players`}>
                <Users className="h-4 w-4" />
                Players
              </Link>
            </Button>
          )}
          <Button asChild variant="ghost" size="sm" className="gap-1.5">
            <Link href={`/tournaments/${tournament.id}/analytics`}>
              <BarChart2 className="h-4 w-4" />
              Analytics
            </Link>
          </Button>
          <Button asChild variant="secondary" size="sm" className="gap-1.5">
            <Link href={`/tournaments/${tournament.id}/matches`}>
              <Swords className="h-4 w-4" />
              Matches
            </Link>
          </Button>
        </div>
      </div>

      {/* Overview */}
      <TournamentOverview tournament={tournament} />

      {/* Live matches */}
      {activeMatches.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-win">
              <span className="h-2 w-2 rounded-full bg-win animate-pulse" />
              Live matches
            </h2>
          </div>
          {activeMatches.map(m => <MatchCard key={m.id} match={m} />)}
        </section>
      )}

      {/* Standings preview */}
      {standings.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-ink-subtle">
              <Trophy className="h-3.5 w-3.5 text-gold" />
              Standings
            </h2>
            <Link
              href={`/tournaments/${tournament.id}/standings`}
              className="text-xs text-gold hover:text-gold-bright transition-colors"
            >
              View all →
            </Link>
          </div>
          <StandingsTable standings={standings.slice(0, 5)} />
        </section>
      )}

      {/* Recent results */}
      {recentCompleted.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-subtle">
              Recent results
            </h2>
            <Link
              href={`/tournaments/${tournament.id}/matches`}
              className="text-xs text-gold hover:text-gold-bright transition-colors"
            >
              All matches →
            </Link>
          </div>
          {recentCompleted.map(m => <MatchCard key={m.id} match={m} />)}
        </section>
      )}

      {/* Player roster */}
      <PlayerRoster
        members={tournament.members}
        tournamentId={tournament.id}
        canManage={canManage ?? false}
      />
    </div>
  )
}
