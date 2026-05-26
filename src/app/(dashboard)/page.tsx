/**
 * Tournament Lobby — the app's home page.
 *
 * Server Component: fetches all tournaments server-side, hands to client shell.
 */

import type { Metadata }        from 'next'
import { Suspense }             from 'react'
import { getTournaments }       from '@/actions/tournament'
import { LobbyClient }          from '@/components/tournament/lobby-client'
import { LobbyLoadingSkeleton } from '@/components/ui/skeleton'

export const metadata: Metadata = { title: 'Lobby — My Backgammon Club' }
export const dynamic = 'force-dynamic'

export default async function LobbyPage() {
  const tournaments = await getTournaments()

  return (
    <Suspense fallback={<LobbyLoadingSkeleton />}>
      <LobbyClient initialTournaments={tournaments} />
    </Suspense>
  )
}
