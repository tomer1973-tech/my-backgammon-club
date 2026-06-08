import type { Metadata } from 'next'
import { notFound }      from 'next/navigation'
import { getMatch }      from '@/actions/match'
import { getMatchLikes } from '@/actions/social'
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

  // Fetch like data for the social bar (only relevant when completed)
  const likeData = match.status === 'COMPLETED'
    ? await getMatchLikes(match.id).catch(() => ({ count: 0, likedByMe: false }))
    : { count: 0, likedByMe: false }

  return <MatchScreen initialMatch={match} initialLikeData={likeData} />
}
