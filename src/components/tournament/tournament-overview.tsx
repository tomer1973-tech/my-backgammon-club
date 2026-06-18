/**
 * TournamentOverview — server component summary panel on the detail page.
 * Shows: name, status, format, location, date, code, description, quick stats.
 */

'use client'

import { MapPin, Calendar, Hash, Users, Trophy, Clock, MessageCircle, Share2 } from 'lucide-react'
import { Badge }         from '@/components/ui/badge'
import { FormatBadge }   from './format-badge'
import { StatusBadge }   from './status-badge'
import { TournamentStatusControls } from './tournament-status-controls'
import type { TournamentWithMembers } from '@/types'

interface TournamentOverviewProps {
  tournament: TournamentWithMembers
}

function InfoRow({ icon: Icon, label, value }: {
  icon:  React.ElementType
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-surface-elevated">
        <Icon className="h-3.5 w-3.5 text-ink-subtle" />
      </div>
      <div>
        <p className="text-xs text-ink-subtle">{label}</p>
        <p className="text-sm font-medium text-ink">{value}</p>
      </div>
    </div>
  )
}

export function TournamentOverview({ tournament: t }: TournamentOverviewProps) {
  const formattedDate = t.startDate
    ? new Date(t.startDate).toLocaleDateString('en-US', {
        weekday: 'long',
        month:   'long',
        day:     'numeric',
        year:    'numeric',
      })
    : null

  const winCount  = t.members.reduce((s, m) => s + m.wins,   0)
  const lossCount = t.members.reduce((s, m) => s + m.losses, 0)
  const gameCount = Math.max(winCount, lossCount)

  return (
    <div className="flex flex-col gap-6">
      {/* Header card */}
      <div className="rounded-xl border border-line bg-surface-raised p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-ink">{t.name}</h1>
            {t.description && (
              <p className="mt-2 text-sm text-ink-muted leading-relaxed max-w-prose">
                {t.description}
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <StatusBadge status={t.status} />
            <FormatBadge format={t.format} />
          </div>
        </div>
      </div>

      {/* Details grid */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-line bg-surface-raised p-5">
          <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-ink-subtle">
            Details
          </h3>
          <div className="flex flex-col gap-4">
            {t.location && <InfoRow icon={MapPin}   label="Location"    value={t.location} />}
            {formattedDate && <InfoRow icon={Calendar} label="Start date" value={formattedDate} />}
            {t.matchLength && (
              <InfoRow icon={Clock} label="Match length" value={`${t.matchLength} points`} />
            )}
            <InfoRow icon={Trophy} label="Points per win" value={t.pointsPerWin} />
            <InfoRow
              icon={Users}
              label="Players"
              value={
                t.maxPlayers
                  ? `${t.memberCount} / ${t.maxPlayers}`
                  : `${t.memberCount} registered`
              }
            />
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-surface-elevated">
                <Hash className="h-3.5 w-3.5 text-ink-subtle" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-ink-subtle">Join code</p>
                <div className="flex items-center gap-2">
                  <p className="font-mono text-base font-bold tracking-widest text-gold">
                    {t.code}
                  </p>
                  <button
                    onClick={() => {
                      const text = `Join my backgammon tournament "${t.name}"! Use code: ${t.code} at My Backgammon Club`
                      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer')
                    }}
                    title="Share invite on WhatsApp"
                    className="inline-flex items-center gap-1 rounded-lg border border-green-700/40 bg-green-900/20 px-2 py-1 text-[10px] font-medium text-green-400 hover:bg-green-900/35 transition-colors"
                  >
                    <MessageCircle className="h-3 w-3" />
                    Invite
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick stats */}
        <div className="rounded-xl border border-line bg-surface-raised p-5">
          <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-ink-subtle">
            Quick stats
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <StatBox label="Games played" value={gameCount} />
            <StatBox label="Players"      value={t.memberCount} />
            <StatBox
              label="Leader"
              value={
                t.members.sort((a, b) => b.points - a.points)[0]?.name ?? '—'
              }
              small
            />
            <StatBox
              label="Top points"
              value={t.members.sort((a, b) => b.points - a.points)[0]?.points ?? 0}
            />
          </div>
        </div>
      </div>

      {/* Status management (only for organizers/owner/admin) */}
      {(t.isOwner || t.userRole === 'ORGANIZER' || t.isAdmin) && (
        <TournamentStatusControls tournament={t} />
      )}
    </div>
  )
}

function StatBox({ label, value, small }: { label: string; value: string | number; small?: boolean }) {
  return (
    <div className="rounded-lg bg-surface-elevated p-3">
      <p className="text-xs text-ink-subtle">{label}</p>
      <p className={small ? 'mt-0.5 text-sm font-semibold text-ink truncate' : 'mt-0.5 text-xl font-bold text-gold'}>
        {value}
      </p>
    </div>
  )
}
