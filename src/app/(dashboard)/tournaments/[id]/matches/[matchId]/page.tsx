import type { Metadata } from 'next'
import { notFound }      from 'next/navigation'
import { getMatch }      from '@/actions/match'
import { MatchScreen }   from '@/components/match/match-screen'

export const dynamic = 'force-dynamic'

interface Props { params: { id: string; matchId: string } }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const m = await getMatch(params.matchId)
    return { title: `${m.player1Name} vs ${m.player2Name}` }
  } catch { return { title: 'Match' } }
}

export default async function MatchPage({ params }: Props) {
  let match
  try { match = await getMatch(params.matchId) } catch { notFound() }

  // Verify match belongs to this tournament
  if (match.tournamentId !== params.id) notFound()

  return <MatchScreen initialMatch={match} />
}
