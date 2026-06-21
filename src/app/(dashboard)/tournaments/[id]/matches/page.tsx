import type { Metadata }             from 'next'
import { notFound }                  from 'next/navigation'
import Link                          from 'next/link'
import { ChevronLeft, Plus, Trophy } from 'lucide-react'
import { getTournamentWithMembers }  from '@/actions/tournament'
import { getTournamentMatches }      from '@/actions/match'
import { MatchCard }                 from '@/components/match/match-card'
import { StatusBadge }               from '@/components/tournament/status-badge'
import { Button }                    from '@/components/ui/button'

export const dynamic = 'force-dynamic'

interface Props { params: { id: string } }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const t = await getTournamentWithMembers(params.id)
    return { title: `${t.name} — Matches` }
  } catch { return { title: 'Matches' } }
}

export default async function MatchesPage({ params }: Props) {
  let tournament, matches
  try {
    [tournament, matches] = await Promise.all([
      getTournamentWithMembers(params.id),
      getTournamentMatches(params.id),
    ])
  } catch { notFound() }

  const activeMatches    = matches.filter(m => m.status === 'ACTIVE')
  const pendingMatches   = matches.filter(m => m.status === 'PENDING')
  const completedMatches = matches.filter(m => m.status === 'COMPLETED')

  // Bracket-aware round labels: in an elimination bracket the last round is the
  // Final, the one before it the Semifinals, etc. Falls back to "Round N".
  const isBracket = matches.some(m => m.bracket != null)
  const maxRound  = matches.reduce((mx, m) => Math.max(mx, m.round ?? 0), 0)
  function roundLabel(round: number): string {
    if (round === Infinity) return 'Other'
    if (!isBracket) return `Round ${round}`
    if (round === maxRound)     return 'Final'
    if (round === maxRound - 1) return 'Semifinals'
    if (round === maxRound - 2) return 'Quarterfinals'
    return `Round ${round}`
  }

  // Group upcoming matches by round (for auto-scheduled formats). Matches with
  // no round (ad-hoc) fall into a single "Other" bucket shown last.
  const hasRounds = pendingMatches.some(m => m.round != null)
  const pendingByRound = hasRounds
    ? Array.from(
        pendingMatches.reduce((map, m) => {
          const key = m.round ?? Infinity
          ;(map.get(key) ?? map.set(key, []).get(key)!).push(m)
          return map
        }, new Map<number, typeof pendingMatches>()),
      ).sort(([a], [b]) => a - b)
    : null

  const canManage = tournament.isOwner || tournament.userRole === 'ORGANIZER' || tournament.isAdmin

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
            <h1 className="text-2xl font-bold text-ink">Matches</h1>
            <p className="mt-0.5 text-sm text-ink-muted">
              {matches.length} total · {completedMatches.length} completed
            </p>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={tournament.status} />
            {canManage && (
              <Button asChild size="sm" className="gap-1.5">
                <Link href={`/tournaments/${params.id}/matches/new`}>
                  <Plus className="h-4 w-4" />
                  New match
                </Link>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Active matches */}
      {activeMatches.length > 0 && (
        <section className="space-y-3">
          <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-win">
            <span className="h-2 w-2 rounded-full bg-win animate-pulse" />
            Live now
          </h2>
          {activeMatches.map(m => <MatchCard key={m.id} match={m} canManage={canManage} />)}
        </section>
      )}

      {/* Pending matches */}
      {pendingMatches.length > 0 && (
        pendingByRound ? (
          <section className="space-y-6">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-subtle">Upcoming</h2>
            {pendingByRound.map(([round, group]) => (
              <div key={round} className="space-y-3">
                <h3 className="text-xs font-semibold text-gold">
                  {roundLabel(round)}
                  <span className="ml-2 font-normal text-ink-subtle">
                    {group.length} match{group.length === 1 ? '' : 'es'}
                  </span>
                </h3>
                {group.map(m => <MatchCard key={m.id} match={m} canManage={canManage} />)}
              </div>
            ))}
          </section>
        ) : (
          <section className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-subtle">Upcoming</h2>
            {pendingMatches.map(m => <MatchCard key={m.id} match={m} canManage={canManage} />)}
          </section>
        )
      )}

      {/* Completed matches */}
      {completedMatches.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-subtle">
            Results ({completedMatches.length})
          </h2>
          {completedMatches.map(m => (
            <MatchCard key={m.id} match={m} canManage={canManage} canEditScore={canManage} />
          ))}
        </section>
      )}

      {/* Empty */}
      {matches.length === 0 && (
        <div className="flex flex-col items-center gap-4 rounded-xl border border-line bg-surface-raised py-16 text-center">
          <Trophy className="h-12 w-12 text-gold/30" />
          <div>
            <p className="text-base font-semibold text-ink">No matches yet</p>
            <p className="mt-1 text-sm text-ink-muted">
              Start the first match between two players.
            </p>
          </div>
          {canManage && (
            <Button asChild size="sm" className="gap-1.5">
              <Link href={`/tournaments/${params.id}/matches/new`}>
                <Plus className="h-4 w-4" />
                Create match
              </Link>
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
