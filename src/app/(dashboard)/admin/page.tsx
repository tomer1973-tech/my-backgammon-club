/**
 * /admin — Platform Administration
 * Restricted to ADMIN role users.
 */

import type { Metadata }  from 'next'
import { redirect }       from 'next/navigation'
import { ShieldCheck, Users, Trophy, Swords, TrendingUp } from 'lucide-react'
import { getSessionUser } from '@/lib/session'
import { getAdminStats, getAllPlayersAdmin } from '@/actions/admin'
import { AdminPlayerTable } from '@/components/admin/admin-player-table'

export const metadata: Metadata = { title: 'Admin — My Backgammon Club' }
export const dynamic = 'force-dynamic'

function StatTile({ icon: Icon, label, value, color }: {
  icon: React.ElementType; label: string; value: number; color: string
}) {
  return (
    <div className="rounded-xl border border-line bg-surface-raised px-5 py-4">
      <div className="flex items-center gap-3">
        <div className={`rounded-lg p-2 ${color}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <p className="text-2xl font-bold text-ink">{value.toLocaleString()}</p>
          <p className="text-xs text-ink-subtle">{label}</p>
        </div>
      </div>
    </div>
  )
}

export default async function AdminPage() {
  const user = await getSessionUser()
  if (!user || user.role !== 'ADMIN') redirect('/')

  const [stats, players] = await Promise.all([
    getAdminStats(),
    getAllPlayersAdmin(),
  ])

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-ink">
          <ShieldCheck className="h-6 w-6 text-gold" />
          Admin Panel
        </h1>
        <p className="mt-0.5 text-sm text-ink-muted">Platform management — handle with care</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatTile icon={Users}     label="Total players"      value={stats.totalPlayers}     color="bg-gold/10 text-gold" />
        <StatTile icon={TrendingUp} label="New this week"     value={stats.newThisWeek}      color="bg-win/10 text-win" />
        <StatTile icon={Trophy}    label="Tournaments"        value={stats.totalTournaments} color="bg-surface-elevated text-ink-muted" />
        <StatTile icon={Swords}    label="Completed matches"  value={stats.totalMatches}     color="bg-surface-elevated text-ink-muted" />
      </div>

      {/* Player management */}
      <div className="rounded-xl border border-line bg-surface-raised overflow-hidden">
        <div className="px-5 py-4 border-b border-line">
          <h2 className="text-sm font-semibold text-ink">Player Management</h2>
          <p className="text-xs text-ink-subtle mt-0.5">Edit roles, update details, remove accounts</p>
        </div>
        <AdminPlayerTable initialPlayers={players} currentUserId={user.id} />
      </div>
    </div>
  )
}
