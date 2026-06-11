import type { Metadata } from 'next'
import Link              from 'next/link'
import { notFound }      from 'next/navigation'
import { getMatch }      from '@/actions/match'
import { getOrCreateLiveGame } from '@/actions/live-game'
import { LiveMatchClient } from '@/components/match/live-match-client'
import { Button }        from '@/components/ui/button'

export const dynamic = 'force-dynamic'

interface Props { params: { id: string; matchId: string } }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const m = await getMatch(params.matchId)
    return { title: `Live — ${m.player1Name} vs ${m.player2Name}` }
  } catch { return { title: 'Live Match' } }
}

export default async function LiveMatchPage({ params }: Props) {
  let match
  try { match = await getMatch(params.matchId) } catch { notFound() }

  if (match.tournamentId !== params.id) notFound()

  const result = await getOrCreateLiveGame(match.id)

  if (!result.success) {
    return (
      <div className="mx-auto max-w-md py-16 text-center space-y-4">
        <p className="text-sm text-ink-muted">{result.error}</p>
        <Link href={`/tournaments/${match.tournamentId}/matches/${match.id}`}>
          <Button variant="secondary">Back to match</Button>
        </Link>
      </div>
    )
  }

  return (
    <LiveMatchClient
      match={match}
      initialLiveGame={result.data.liveGame}
      myColor={result.data.myColor}
    />
  )
}
