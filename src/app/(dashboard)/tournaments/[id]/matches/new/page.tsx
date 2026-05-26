import type { Metadata }            from 'next'
import { notFound }                 from 'next/navigation'
import Link                         from 'next/link'
import { ChevronLeft }              from 'lucide-react'
import { getTournamentWithMembers } from '@/actions/tournament'
import { MatchSetup }               from '@/components/match/match-setup'

export const dynamic = 'force-dynamic'

interface Props { params: { id: string } }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const t = await getTournamentWithMembers(params.id)
    return { title: `New Match — ${t.name}` }
  } catch { return { title: 'New Match' } }
}

export default async function NewMatchPage({ params }: Props) {
  let tournament
  try { tournament = await getTournamentWithMembers(params.id) } catch { notFound() }

  if (tournament.members.length < 2) {
    return (
      <div className="flex flex-col gap-4 animate-fade-in">
        <Link
          href={`/tournaments/${params.id}/matches`}
          className="inline-flex items-center gap-1 text-sm text-ink-muted hover:text-ink"
        >
          <ChevronLeft className="h-4 w-4" />
          Matches
        </Link>
        <div className="rounded-xl border border-line bg-surface-raised py-12 text-center">
          <p className="text-sm font-medium text-ink">Not enough players</p>
          <p className="mt-1 text-sm text-ink-muted">
            Add at least 2 players to the tournament before starting a match.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <div>
        <Link
          href={`/tournaments/${params.id}/matches`}
          className="inline-flex items-center gap-1 text-sm text-ink-muted hover:text-ink transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          Matches
        </Link>
        <h1 className="mt-3 text-2xl font-bold text-ink">New match</h1>
        <p className="mt-1 text-sm text-ink-muted">
          {tournament.name} · Race-to match
        </p>
      </div>

      <MatchSetup
        tournamentId={params.id}
        members={tournament.members}
      />
    </div>
  )
}
