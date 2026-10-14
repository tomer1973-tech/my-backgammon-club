import type { Metadata } from 'next'
import { notFound }      from 'next/navigation'
import { getMatch }      from '@/actions/match'
import { getMatchLikes } from '@/actions/social'
import { MatchScreen }   from '@/components/match/match-screen'
import { canCorrectTournament } from '@/actions/corrections'

export const dynamic = 'force-dynamic'

interface Props { params: Promise<{ id: string; matchId: string }> }

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params;
  try {
    const m = await getMatch(params.matchId)
    return { title: `${m.player1Name} vs ${m.player2Name}` }
  } catch { return { title: 'Match' } }
}

export default async function MatchPage(props: Props) {
  const params = await props.params;
  let match
  try { match = await getMatch(params.matchId) } catch { notFound() }

  // Verify match belongs to this tournament
  if (match.tournamentId !== params.id) notFound()

  // Fetch like data for the social bar (only relevant when completed)
  const [likeData, canCorrect] = await Promise.all([
    match.status === 'COMPLETED'
      ? getMatchLikes(match.id).catch(() => ({ count: 0, likedByMe: false }))
      : Promise.resolve({ count: 0, likedByMe: false }),
    canCorrectTournament(match.tournamentId),
  ])

  return <MatchScreen initialMatch={match} initialLikeData={likeData} canCorrect={canCorrect} />
}
