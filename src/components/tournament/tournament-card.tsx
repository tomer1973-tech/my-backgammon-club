'use client'

import Link                         from 'next/link'
import { useState }                 from 'react'
import { MapPin, Users, Calendar, Crown, MoreVertical, Trash2, Archive, ArrowRight, Lock, Star } from 'lucide-react'
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
          'transition-all duration-200',
          t.status === 'ACTIVE'
            ? 'border-win/30 hover:border-win/60 hover:shadow-[0_0_0_1px_hsl(var(--win)/0.15),0_4px_20px_hsl(var(--win)/0.08)]'
            : 'border-line hover:border-gold/40 hover:shadow-gold',
        )}
      >
        {/* Card body — links to detail page */}
        <Link href={`/tournaments/${t.id}`} className="flex flex-col gap-4 p-5">
          {/* Top row: status badge */}
          <div className="flex items-start justify-between gap-2">
            <StatusBadge status={t.status} className="shrink-0" />
            <div className="flex items-center gap-1.5">
              {t.isPrivate && (
                <span className="flex items-center gap-1 text-[10px] text-ink-subtle">
                  <Lock className="h-3 w-3" />
                  Private
                </span>
              )}
              {t.isOwner && (
                <span className="flex items-center gap-1 text-[10px] text-gold/70">
                  <Crown className="h-3 w-3" />
                  Yours
                </span>
              )}
            </div>
          </div>

          {/* Name */}
          <div>
            <h3 className="text-base font-bold text-ink group-hover:text-gold transition-colors leading-tight">
              {t.name}
            </h3>
          </div>

          {/* Meta row */}
          <div className="flex flex-wrap gap-x-3 gap-y-1.5 text-xs text-ink-subtle">
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {t.memberCount}{t.maxPlayers ? `/${t.maxPlayers}` : ''} players
            </span>
            {t.location && (
              <span className="flex items-center gap-1 truncate max-w-[120px]">
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

          {/* Bottom row: format + points per win */}
          <div className="flex items-center justify-between gap-2">
            <FormatBadge format={t.format} />
            {t.pointsPerWin > 0 && (
              <span className="flex items-center gap-1 rounded-full border border-gold/30 bg-gold/10 px-2.5 py-0.5 text-[11px] font-bold text-gold">
                <Star className="h-3 w-3 fill-gold" />
                {t.pointsPerWin} pts/win
              </span>
            )}
          </div>
        </Link>

        {/* Actions row */}
        <div className="flex items-center gap-2 border-t border-line/50 px-4 py-3">
          <Button
            asChild
            size="default"
            variant={t.isMember && t.status === 'ACTIVE' ? 'default' : 'secondary'}
            className={cn(
              'flex-1 gap-1.5',
              t.isMember && t.status === 'ACTIVE' && 'shadow-gold',
            )}
          >
            <Link href={`/tournaments/${t.id}`}>
              {t.isMember ? 'Open' : 'View'}
              <ArrowRight className="h-4 w-4" />
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
