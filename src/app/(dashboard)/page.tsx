/**
 * Tournament Lobby — the app's home page.
 *
 * Server Component: fetches all tournaments server-side, hands to client shell.
 */

import type { Metadata }        from 'next'
import { Suspense }             from 'react'
import { getTournaments }       from '@/actions/tournament'
import { getSessionUser }       from '@/lib/session'
import { getLobbyHeader }       from '@/actions/stats'
import { LobbyClient }          from '@/components/tournament/lobby-client'
import { LobbyLoadingSkeleton } from '@/components/ui/skeleton'

export const metadata: Metadata = { title: 'Lobby — My Backgammon Club' }
export const dynamic = 'force-dynamic'

export default async function LobbyPage() {
  const [tournaments, currentUser] = await Promise.all([
    getTournaments(),
    getSessionUser(),
  ])

  // Hero stat ribbon + recent matches — only meaningful for a signed-in player.
  const header = currentUser ? await getLobbyHeader().catch(() => null) : null

  return (
    <Suspense fallback={<LobbyLoadingSkeleton />}>
      <LobbyClient initialTournaments={tournaments} currentUser={currentUser} header={header} />
    </Suspense>
  )
}
