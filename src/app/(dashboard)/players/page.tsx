/**
 * /players — Platform Roster
 */

import type { Metadata } from 'next'
import { Users }         from 'lucide-react'
import { getAllPlayers }  from '@/actions/stats'
import { getSessionUser } from '@/lib/session'
import { PlayersList }   from '@/components/players/players-list'

export const metadata: Metadata = { title: 'Players — My Backgammon Club' }
export const dynamic = 'force-dynamic'

export default async function PlayersPage() {
  const [me, players] = await Promise.all([
    getSessionUser(),
    getAllPlayers(),
  ])

  const sorted = [...players].sort((a, b) => {
    if (b.totalMatches !== a.totalMatches) return b.totalMatches - a.totalMatches
    return a.name.localeCompare(b.name)
  })

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-ink">
          <Users className="h-6 w-6 text-gold" />
          Players
        </h1>
        <p className="mt-0.5 text-sm text-ink-muted">
          {players.length} registered {players.length === 1 ? 'player' : 'players'} on the platform
        </p>
      </div>

      <PlayersList players={sorted} meId={me?.id ?? null} />
    </div>
  )
}
