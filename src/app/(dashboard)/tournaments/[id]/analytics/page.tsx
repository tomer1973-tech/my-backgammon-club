import type { Metadata }            from 'next'
import { notFound }                 from 'next/navigation'
import Link                         from 'next/link'
import { ChevronLeft, BarChart2 }   from 'lucide-react'
import { getTournamentWithMembers } from '@/actions/tournament'
import { getTournamentAnalytics }   from '@/actions/analytics'
import { AnalyticsDashboard }       from '@/components/analytics/analytics-dashboard'
import { ExportMenu }               from '@/components/export/export-menu'
import { getSessionUser }           from '@/lib/session'

export const dynamic = 'force-dynamic'

interface Props { params: { id: string } }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const t = await getTournamentWithMembers(params.id)
    return { title: `${t.name} — Analytics` }
  } catch { return { title: 'Analytics' } }
}

export default async function AnalyticsPage({ params }: Props) {
  let tournament, analyticsData
  try {
    [tournament, analyticsData] = await Promise.all([
      getTournamentWithMembers(params.id),
      getTournamentAnalytics(params.id),
    ])
  } catch { notFound() }

  const user      = await getSessionUser()
  const canManage = tournament.isOwner || tournament.userRole === 'ORGANIZER' || user?.role === 'ADMIN'

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      {/* Header */}
      <div>
        <Link
          href={`/tournaments/${params.id}`}
          className="inline-flex items-center gap-1 text-sm text-ink-muted hover:text-ink transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          {tournament.name}
        </Link>

        <div className="mt-3 flex items-start justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-ink">
              <BarChart2 className="h-6 w-6 text-gold" />
              Analytics
            </h1>
            <p className="mt-0.5 text-sm text-ink-muted">
              Tournament intelligence · auto-refreshes every visit
            </p>
          </div>
          <ExportMenu tournamentId={params.id} />
        </div>
      </div>

      {/* Dashboard */}
      <AnalyticsDashboard
        data={analyticsData}
        tournamentId={params.id}
        canManage={canManage ?? false}
      />
    </div>
  )
}
