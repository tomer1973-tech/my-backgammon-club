import type { Metadata }            from 'next'
import { notFound }                 from 'next/navigation'
import Link                         from 'next/link'
import { ChevronLeft, User }        from 'lucide-react'
import { getTournamentWithMembers } from '@/actions/tournament'
import { getPlayerAnalytics }       from '@/actions/analytics'
import { PlayerAnalyticsView }      from '@/components/analytics/player-analytics'
import { Badge }                    from '@/components/ui/badge'
import { Avatar }                   from '@/components/ui/avatar'
import { Shield }                   from 'lucide-react'

export const dynamic = 'force-dynamic'

interface Props { params: { id: string; memberId: string } }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const t = await getTournamentWithMembers(params.id)
    const m = t.members.find(m => m.id === params.memberId)
    if (!m) return { title: 'Player' }
    return { title: `${m.name} — ${t.name}` }
  } catch { return { title: 'Player' } }
}

export default async function PlayerProfilePage({ params }: Props) {
  let tournament, analyticsData
  try {
    [tournament, analyticsData] = await Promise.all([
      getTournamentWithMembers(params.id),
      getPlayerAnalytics(params.id, params.memberId),
    ])
  } catch { notFound() }

  const member = tournament.members.find(m => m.id === params.memberId)
  if (!member) notFound()

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      {/* Back nav */}
      <div>
        <Link
          href={`/tournaments/${params.id}`}
          className="inline-flex items-center gap-1 text-sm text-ink-muted hover:text-ink transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          {tournament.name}
        </Link>

        {/* Player header */}
        <div className="mt-4 flex items-start gap-4">
          <Avatar name={member.name} size="lg" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold text-ink">{member.name}</h1>
              {member.isGuest && <Badge variant="guest">Guest</Badge>}
              {member.memberRole === 'ORGANIZER' && (
                <Badge variant="gold" className="gap-1">
                  <Shield className="h-2.5 w-2.5" />
                  Organizer
                </Badge>
              )}
            </div>
            <div className="mt-1 flex items-center gap-3 text-sm text-ink-muted">
              <span className="text-win font-medium">{member.wins}W</span>
              <span className="text-loss">{member.losses}L</span>
              <span className="text-gold font-medium">{member.points} pts</span>
            </div>
          </div>
        </div>
      </div>

      {/* Analytics */}
      <PlayerAnalyticsView data={analyticsData} />
    </div>
  )
}
