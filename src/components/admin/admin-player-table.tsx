'use client'

/**
 * AdminPlayerTable — searchable, fully interactive player management table.
 * Inline role editing, delete with confirm, avatar reset, bio preview.
 */

import { useState, useTransition } from 'react'
import Link                        from 'next/link'
import { useRouter }               from 'next/navigation'
import {
  Search, Shield, User, Trash2, RotateCcw, ChevronDown, Check, X, ExternalLink,
} from 'lucide-react'
import { Avatar }              from '@/components/ui/avatar'
import { Button }              from '@/components/ui/button'
import { Input }               from '@/components/ui/input'
import { adminUpdatePlayer, adminDeletePlayer, adminResetAvatar } from '@/actions/admin'
import type { AdminPlayer }    from '@/actions/admin'
import { cn }                  from '@/lib/utils'

const ROLE_OPTIONS = [
  { value: 'PLAYER',              label: 'Player',     color: 'text-ink-muted' },
  { value: 'TOURNAMENT_MANAGER',  label: 'Organizer',  color: 'text-gold' },
  { value: 'ADMIN',               label: 'Admin',      color: 'text-win' },
] as const

interface Props {
  initialPlayers: AdminPlayer[]
  currentUserId:  string
}

export function AdminPlayerTable({ initialPlayers, currentUserId }: Props) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [players, setPlayers] = useState(initialPlayers)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName]   = useState('')
  const [editBio,  setEditBio]    = useState('')
  const [editRole, setEditRole]   = useState('')
  const [pending, startTransition] = useTransition()
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const filtered = query.trim()
    ? players.filter(p =>
        p.name.toLowerCase().includes(query.toLowerCase()) ||
        p.email.toLowerCase().includes(query.toLowerCase()),
      )
    : players

  function startEdit(p: AdminPlayer) {
    setEditingId(p.id)
    setEditName(p.name)
    setEditBio(p.bio ?? '')
    setEditRole(p.role)
  }

  function cancelEdit() { setEditingId(null) }

  function saveEdit(playerId: string) {
    startTransition(async () => {
      const res = await adminUpdatePlayer(playerId, {
        name: editName,
        bio:  editBio || null,
        role: editRole,
      })
      if (res.success) {
        setPlayers(prev => prev.map(p =>
          p.id === playerId ? { ...p, name: editName, bio: editBio || null, role: editRole } : p
        ))
        setEditingId(null)
      }
    })
  }

  function deletePlayer(playerId: string) {
    startTransition(async () => {
      const res = await adminDeletePlayer(playerId)
      if (res.success) {
        setPlayers(prev => prev.filter(p => p.id !== playerId))
        setConfirmDelete(null)
      }
    })
  }

  function resetAvatar(playerId: string) {
    startTransition(async () => {
      const res = await adminResetAvatar(playerId)
      if (res.success) {
        setPlayers(prev => prev.map(p => p.id === playerId ? { ...p, avatarUrl: null } : p))
      }
    })
  }

  return (
    <div>
      {/* Search */}
      <div className="px-5 py-3 border-b border-line">
        <Input
          name="search"
          placeholder="Search by name or email…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          leading={<Search className="h-4 w-4" />}
        />
      </div>

      {/* Table */}
      <div className="divide-y divide-line/50">
        {filtered.length === 0 && (
          <div className="py-12 text-center text-sm text-ink-muted">No players found.</div>
        )}

        {filtered.map(player => {
          const isEditing = editingId === player.id
          const isSelf    = player.id === currentUserId

          return (
            <div key={player.id} className={cn(
              'px-5 py-4 transition-colors',
              isEditing ? 'bg-surface-elevated' : 'hover:bg-surface-elevated/50',
            )}>
              <div className="flex items-start gap-4">
                {/* Avatar */}
                <div className="relative shrink-0">
                  <Avatar name={player.name} src={player.avatarUrl} size="md" />
                  {player.avatarUrl && (
                    <button
                      onClick={() => resetAvatar(player.id)}
                      title="Reset avatar"
                      className="absolute -top-1 -right-1 rounded-full bg-surface-base border border-line p-0.5 text-ink-subtle hover:text-loss transition-colors"
                    >
                      <RotateCcw className="h-2.5 w-2.5" />
                    </button>
                  )}
                </div>

                {/* Main info */}
                <div className="flex-1 min-w-0">
                  {isEditing ? (
                    /* Edit mode */
                    <div className="space-y-2">
                      <input
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        className="w-full rounded-lg border border-line bg-surface-base px-3 py-1.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-gold/40"
                        placeholder="Display name"
                      />
                      <textarea
                        value={editBio}
                        onChange={e => setEditBio(e.target.value)}
                        rows={2}
                        className="w-full rounded-lg border border-line bg-surface-base px-3 py-1.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-gold/40 resize-none"
                        placeholder="Bio (optional)"
                        maxLength={200}
                      />
                      {/* Role selector */}
                      <div className="flex gap-2">
                        {ROLE_OPTIONS.map(r => (
                          <button
                            key={r.value}
                            onClick={() => setEditRole(r.value)}
                            className={cn(
                              'flex-1 rounded-lg border py-1.5 text-xs font-medium transition-colors',
                              editRole === r.value
                                ? 'border-gold bg-gold/10 text-gold'
                                : 'border-line text-ink-muted hover:border-gold/40',
                            )}
                          >
                            {r.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    /* View mode */
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link
                          href={`/players/${player.id}`}
                          className="text-sm font-semibold text-ink hover:text-gold transition-colors flex items-center gap-1"
                        >
                          {player.name}
                          <ExternalLink className="h-3 w-3 opacity-50" />
                        </Link>
                        <RolePill role={player.role} />
                        {isSelf && (
                          <span className="text-[10px] bg-gold/10 text-gold px-1.5 py-0.5 rounded-full font-medium">You</span>
                        )}
                        {player.isPrivate && (
                          <span className="text-[10px] bg-surface-elevated text-ink-subtle px-1.5 py-0.5 rounded-full">Private</span>
                        )}
                      </div>
                      <p className="text-xs text-ink-subtle mt-0.5 truncate">{player.email}</p>
                      {player.bio && (
                        <p className="text-xs text-ink-muted mt-1 line-clamp-1">{player.bio}</p>
                      )}
                      <div className="flex gap-3 mt-1.5 text-[11px] text-ink-subtle">
                        <span>{player.totalTournaments} tournaments</span>
                        <span>{player.totalMatches} matches</span>
                        <span>{player.followerCount} followers</span>
                        <span>Joined {new Date(player.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  {isEditing ? (
                    <>
                      <Button size="sm" onClick={() => saveEdit(player.id)} isLoading={pending} className="gap-1">
                        <Check className="h-3.5 w-3.5" /> Save
                      </Button>
                      <Button size="sm" variant="ghost" onClick={cancelEdit}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button size="sm" variant="secondary" onClick={() => startEdit(player)} className="text-xs">
                        Edit
                      </Button>
                      {!isSelf && (
                        confirmDelete === player.id ? (
                          <div className="flex gap-1">
                            <Button size="sm" variant="destructive" onClick={() => deletePlayer(player.id)} isLoading={pending} className="text-xs">
                              Confirm
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(null)} className="text-xs">
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <Button
                            size="sm" variant="ghost"
                            onClick={() => setConfirmDelete(player.id)}
                            className="text-ink-subtle hover:text-loss"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="px-5 py-3 border-t border-line text-xs text-ink-subtle">
        {filtered.length} of {players.length} players
      </div>
    </div>
  )
}

function RolePill({ role }: { role: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    ADMIN:              { label: 'Admin',     cls: 'bg-win/10 text-win' },
    TOURNAMENT_MANAGER: { label: 'Organizer', cls: 'bg-gold/10 text-gold' },
    PLAYER:             { label: 'Player',    cls: 'bg-surface-elevated text-ink-subtle' },
  }
  const { label, cls } = map[role] ?? map.PLAYER
  return (
    <span className={cn('rounded-full px-1.5 py-0.5 text-[10px] font-semibold', cls)}>
      {label}
    </span>
  )
}
