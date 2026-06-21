/**
 * PlayerCard — a single member row in the roster.
 * Shows avatar, name, role badge, W/L record, and points.
 * Optional remove / role-change controls for organizers.
 */

'use client'

import { useState }         from 'react'
import Link                 from 'next/link'
import { Shield, Trash2, Pencil, Check, X } from 'lucide-react'
import { Avatar }           from '@/components/ui/avatar'
import { Badge }            from '@/components/ui/badge'
import { Button }           from '@/components/ui/button'
import { removeMember, updateMemberRole } from '@/actions/player'
import { updateGuestName }  from '@/actions/match'
import { cn }               from '@/lib/utils'
import type { Member }      from '@/types'

interface PlayerCardProps {
  member:       Member
  tournamentId: string
  canManage?:   boolean
  showLink?:    boolean
}

export function PlayerCard({ member, tournamentId, canManage = false, showLink = true }: PlayerCardProps) {
  const [removing,    setRemoving]    = useState(false)
  const [promoting,   setPromoting]   = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [nameVal,     setNameVal]     = useState(member.name)
  const [error,       setError]       = useState<string | null>(null)

  const winRate = member.wins + member.losses > 0
    ? Math.round((member.wins / (member.wins + member.losses)) * 100)
    : 0

  async function handleRemove() {
    if (!confirm(`Remove ${member.name} from this tournament?`)) return
    setRemoving(true)
    setError(null)
    const result = await removeMember({ memberId: member.id, tournamentId })
    setRemoving(false)
    if (!result.success) setError(result.error)
  }

  async function handleRenameGuest() {
    if (!nameVal.trim()) return
    setError(null)
    const result = await updateGuestName(member.id, nameVal)
    if (!result.success) { setError(result.error ?? null); return }
    setEditingName(false)
  }

  async function handleToggleRole() {
    const newRole = member.memberRole === 'ORGANIZER' ? 'PARTICIPANT' : 'ORGANIZER'
    setPromoting(true)
    setError(null)
    const result = await updateMemberRole({ memberId: member.id, role: newRole })
    setPromoting(false)
    if (!result.success) setError(result.error)
  }

  return (
    <div className="flex items-center gap-3 py-3 group">
      {/* Avatar */}
      <Avatar name={member.name} size="md" />

      {/* Name + role */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          {canManage && member.isGuest && editingName ? (
            <span className="flex items-center gap-1">
              <input
                autoFocus
                value={nameVal}
                onChange={e => setNameVal(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleRenameGuest(); if (e.key === 'Escape') { setEditingName(false); setNameVal(member.name) } }}
                className="w-32 rounded border border-gold/40 bg-surface-elevated px-2 py-0.5 text-sm font-medium text-ink focus:border-gold/70 focus:outline-none"
              />
              <button onClick={handleRenameGuest} className="text-win hover:text-win/80"><Check className="h-3.5 w-3.5" /></button>
              <button onClick={() => { setEditingName(false); setNameVal(member.name) }} className="text-ink-subtle hover:text-ink"><X className="h-3.5 w-3.5" /></button>
            </span>
          ) : showLink ? (
            <Link
              href={`/tournaments/${tournamentId}/players/${member.id}`}
              className="truncate text-sm font-medium text-ink hover:text-gold transition-colors"
            >
              {member.name}
            </Link>
          ) : (
            <span className="truncate text-sm font-medium text-ink">{member.name}</span>
          )}
          {member.isGuest && !editingName && (
            <Badge variant="guest" className="shrink-0">Guest</Badge>
          )}
          {member.memberRole === 'ORGANIZER' && (
            <Badge variant="gold" className="shrink-0 gap-1">
              <Shield className="h-2.5 w-2.5" />
              Organizer
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs text-ink-subtle mt-0.5">
          <span className="text-win">{member.wins}W</span>
          <span className="text-loss">{member.losses}L</span>
          {member.wins + member.losses > 0 && (
            <span>{winRate}% win rate</span>
          )}
          <span className="font-medium text-gold">{member.points} pts</span>
        </div>
        {error && <p className="text-xs text-loss mt-0.5">{error}</p>}
      </div>

      {/* Organizer actions */}
      {canManage && !editingName && (
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {member.isGuest && (
            <Button
              size="icon-sm"
              variant="ghost"
              onClick={() => setEditingName(true)}
              aria-label="Rename guest"
              title="Rename guest"
            >
              <Pencil className="h-3.5 w-3.5 text-ink-subtle" />
            </Button>
          )}
          {!member.isGuest && (
            <Button
              size="icon-sm"
              variant="ghost"
              onClick={handleToggleRole}
              isLoading={promoting}
              aria-label={member.memberRole === 'ORGANIZER' ? 'Demote to participant' : 'Promote to organizer'}
              title={member.memberRole === 'ORGANIZER' ? 'Demote to participant' : 'Promote to organizer'}
            >
              <Shield className={cn(
                'h-3.5 w-3.5',
                member.memberRole === 'ORGANIZER' ? 'text-gold' : 'text-ink-subtle',
              )} />
            </Button>
          )}
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={handleRemove}
            isLoading={removing}
            aria-label="Remove player"
            className="hover:text-loss"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </div>
  )
}
