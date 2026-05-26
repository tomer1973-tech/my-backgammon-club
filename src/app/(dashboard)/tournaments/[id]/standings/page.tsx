import type { Metadata }            from 'next'
import { notFound }                 from 'next/navigation'
import Link                         from 'next/link'
import { ChevronLeft }              from 'lucide-react'
import { getTournamentWithMembers } from '@/actions/tournament'
import { getStandings }             from '@/actions/match'
import { StandingsTable }           from '@/components/match/standings-table'
import { StatusBadge }              from '@/components/tournament/status-badge'

export const dynamic = 'force-dynamic'

interface Props { params: { id: string } }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const t = await getTournamentWithMembers(params.id)
    return { title: `${t.name} — Standings` }
  } catch { return { title: 'Standings' } }
}

export default async function StandingsPage({ params }: Props) {
  let tournament, standings
  try {
    [tournament, standings] = await Promise.all([
      getTournamentWithMembers(params.id),
      getStandings(params.id),
    ])
  } catch { notFound() }

  const leader = standings[0]

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      {/* Header */}
      <div>
        <Link
          href={`/tournaments/${params.id}`}
          className="inline-flex items-center gap-1 text-sm text-ink-muted hover:text-ink transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          {tournament.name}
        </Link>

        <div className="mt-3 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-ink">Standings</h1>
            <p className="mt-0.5 text-sm text-ink-muted">
              {standings.length} players · auto-updates after each match
            </p>
          </div>
          <StatusBadge status={tournament.status} />
        </div>
      </div>

      {/* Leader highlight */}
      {leader && leader.wins > 0 && (
        <div className="rounded-xl border border-gold/30 bg-gold/8 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gold/70">
                Current leader
              </p>
              <p className="mt-0.5 text-xl font-bold text-gold">{leader.name}</p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-black text-gold">{leader.points}</p>
              <p className="text-xs text-gold/70">points</p>
            </div>
          </div>
          <div className="mt-2 flex gap-4 text-sm">
            <span className="text-win">{leader.wins}W</span>
            <span className="text-loss">{leader.losses}L</span>
            <span className="text-ink-muted">{leader.winRate}% win rate</span>
          </div>
        </div>
      )}

      {/* Table */}
      <StandingsTable standings={standings} />

      {/* Tiebreaker note */}
      <p className="text-xs text-ink-subtle text-center">
        Ranked by tournament points → wins → match differential → win rate.
      </p>
    </div>
  )
}
