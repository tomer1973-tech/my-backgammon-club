import type { Metadata }              from 'next'
import { notFound }                   from 'next/navigation'
import Link                           from 'next/link'
import { ChevronLeft }                from 'lucide-react'
import { getTournamentWithMembers }   from '@/actions/tournament'
import { PlayerRoster }               from '@/components/players/player-roster'
import { getSessionUser }             from '@/lib/session'
import { StatusBadge }                from '@/components/tournament/status-badge'

export const dynamic = 'force-dynamic'

interface Props {
  params: { id: string }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const t = await getTournamentWithMembers(params.id)
    return { title: `${t.name} — Players` }
  } catch {
    return { title: 'Players — My Backgammon Club' }
  }
}

export default async function PlayersPage({ params }: Props) {
  let tournament
  try {
    tournament = await getTournamentWithMembers(params.id)
  } catch {
    notFound()
  }

  const user      = await getSessionUser()
  // Any logged-in user can add players to a tournament
  const canManage = !!user

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      {/* Header */}
      <div>
        <Link
          href={`/tournaments/${tournament.id}`}
          className="inline-flex items-center gap-1 text-sm text-ink-muted hover:text-ink transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          {tournament.name}
        </Link>

        <div className="mt-3 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-ink">Players</h1>
            <p className="mt-0.5 text-sm text-ink-muted">
              {tournament.memberCount} registered
              {tournament.maxPlayers ? ` / ${tournament.maxPlayers} max` : ''}
            </p>
          </div>
          <StatusBadge status={tournament.status} />
        </div>
      </div>

      {/* Full roster */}
      <PlayerRoster
        members={tournament.members}
        tournamentId={tournament.id}
        canManage={canManage ?? false}
      />

      {/* Join code reminder for organizers */}
      {canManage && (
        <div className="rounded-xl border border-line bg-surface-raised p-5">
          <p className="text-xs text-ink-subtle mb-1">Share this code to invite players</p>
          <p className="font-mono text-2xl font-bold tracking-widest text-gold">
            {tournament.code}
          </p>
          <p className="mt-1 text-xs text-ink-subtle">
            Players can enter this code under &ldquo;Join tournament&rdquo; in the lobby.
          </p>
        </div>
      )}
    </div>
  )
}
