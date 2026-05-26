'use client'

import Link                         from 'next/link'
import { useState }                 from 'react'
import { MapPin, Users, Calendar, Crown, MoreVertical, Trash2, Archive } from 'lucide-react'
import { Button }                   from '@/components/ui/button'
import { FormatBadge }              from './format-badge'
import { StatusBadge }              from './status-badge'
import { DeleteConfirm }            from './delete-confirm'
import { cn }                       from '@/lib/utils'
import type { Tournament }          from '@/types'

interface TournamentCardProps {
  tournament: Tournament
  onDelete?:  (id: string) => void
  onArchive?: (id: string) => void
}

export function TournamentCard({ tournament, onDelete, onArchive }: TournamentCardProps) {
  const [menuOpen, setMenuOpen]     = useState(false)
  const [delConfirm, setDelConfirm] = useState(false)

  const t = tournament

  const formattedDate = t.startDate
    ? new Date(t.startDate).toLocaleDateString('en-US', {
        month: 'short',
        day:   'numeric',
        year:  'numeric',
      })
    : null

  return (
    <>
      <div
        className={cn(
          'group relative flex flex-col rounded-xl border bg-surface-raised',
          'transition-all duration-200 hover:border-gold/40 hover:shadow-gold',
          t.status === 'ACTIVE'
            ? 'border-win/30'
            : 'border-line',
        )}
      >
        {/* Card body — links to detail page */}
        <Link href={`/tournaments/${t.id}`} className="flex flex-col gap-3 p-5">
          {/* Top row: name + status */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h3 className="truncate text-sm font-semibold text-ink group-hover:text-gold transition-colors">
                {t.name}
              </h3>
              {t.isOwner && (
                <span className="mt-0.5 flex items-center gap-1 text-xs text-gold/70">
                  <Crown className="h-3 w-3" />
                  Your tournament
                </span>
              )}
            </div>
            <StatusBadge status={t.status} className="shrink-0" />
          </div>

          {/* Meta row */}
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-subtle">
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {t.memberCount} {t.memberCount === 1 ? 'player' : 'players'}
              {t.maxPlayers ? ` / ${t.maxPlayers}` : ''}
            </span>
            {t.location && (
              <span className="flex items-center gap-1 truncate">
                <MapPin className="h-3 w-3 shrink-0" />
                {t.location}
              </span>
            )}
            {formattedDate && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {formattedDate}
              </span>
            )}
          </div>

          {/* Format badge */}
          <FormatBadge format={t.format} />
        </Link>

        {/* Actions row */}
        <div className="flex items-center gap-2 border-t border-line/50 px-5 py-3">
          <Button asChild size="sm" variant="secondary" className="flex-1 text-xs">
            <Link href={`/tournaments/${t.id}`}>
              {t.isMember ? 'Open' : 'View'}
            </Link>
          </Button>

          {/* Owner actions menu */}
          {(t.isOwner || t.userRole === 'ORGANIZER') && (
            <div className="relative">
              <Button
                size="icon-sm"
                variant="ghost"
                onClick={() => setMenuOpen(v => !v)}
                aria-label="Tournament options"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>

              {menuOpen && (
                <>
                  {/* Backdrop */}
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setMenuOpen(false)}
                  />
                  <div className="absolute bottom-full right-0 z-20 mb-1 w-44 rounded-lg border border-line bg-surface-elevated shadow-elevated">
                    {onArchive && t.status !== 'ARCHIVED' && (
                      <button
                        onClick={() => { onArchive(t.id); setMenuOpen(false) }}
                        className="flex w-full items-center gap-2 px-3 py-2.5 text-sm text-ink-muted hover:bg-surface-raised hover:text-ink transition-colors rounded-t-lg"
                      >
                        <Archive className="h-3.5 w-3.5" />
                        Archive
                      </button>
                    )}
                    {t.isOwner && onDelete && (
                      <button
                        onClick={() => { setDelConfirm(true); setMenuOpen(false) }}
                        className="flex w-full items-center gap-2 px-3 py-2.5 text-sm text-loss hover:bg-loss/10 transition-colors rounded-b-lg"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Delete confirmation dialog */}
      {onDelete && (
        <DeleteConfirm
          open={delConfirm}
          tournamentName={t.name}
          tournamentId={t.id}
          onClose={() => setDelConfirm(false)}
          onDeleted={() => onDelete(t.id)}
        />
      )}
    </>
  )
}
