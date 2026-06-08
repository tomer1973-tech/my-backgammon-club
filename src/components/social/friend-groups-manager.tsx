'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import { Users, Plus, Trash2, X, Search, UserPlus2 }   from 'lucide-react'
import { cn }                                           from '@/lib/utils'
import { Button }                                       from '@/components/ui/button'
import {
  createFriendGroup,
  deleteFriendGroup,
  addToGroup,
  removeFromGroup,
  searchPlayers,
  type FriendGroupWithMembers,
  type PlayerSearchResult,
} from '@/actions/social'

interface FriendGroupsManagerProps {
  initialGroups: FriendGroupWithMembers[]
  className?:    string
}

// ─── Avatar helper ────────────────────────────────────────────────────────────

function MiniAvatar({ name, url }: { name: string; url: string | null }) {
  if (url) {
    return <img src={url} alt={name} className="h-7 w-7 rounded-full object-cover" />
  }
  const initials = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
  return (
    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gold/15 text-xs font-bold text-gold">
      {initials}
    </div>
  )
}

// ─── Player search dropdown ───────────────────────────────────────────────────

function PlayerSearchInput({
  groupId,
  existingIds,
  onAdded,
}: {
  groupId:     string
  existingIds: string[]
  onAdded:     () => void
}) {
  const [query,   setQuery]   = useState('')
  const [results, setResults] = useState<PlayerSearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [open,    setOpen]    = useState(false)
  const ref                   = useRef<HTMLDivElement>(null)
  const [isPending, startTransition] = useTransition()

  // Debounce search
  useEffect(() => {
    if (!query.trim()) { setResults([]); setOpen(false); return }
    setLoading(true)
    const timer = setTimeout(async () => {
      try {
        const res = await searchPlayers(query)
        setResults(res.filter(r => !existingIds.includes(r.id)))
        setOpen(true)
      } finally {
        setLoading(false)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [query, existingIds])

  // Click-outside
  useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  function handleAdd(player: PlayerSearchResult) {
    startTransition(async () => {
      await addToGroup(groupId, player.id)
      setQuery('')
      setResults([])
      setOpen(false)
      onAdded()
    })
  }

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-ink-subtle pointer-events-none" />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search players to add…"
          className={cn(
            'w-full rounded-lg border border-line bg-surface-base pl-8 pr-3 py-2 text-sm text-ink',
            'placeholder:text-ink-subtle focus:outline-none focus:ring-1 focus:ring-gold/40',
            isPending && 'opacity-60',
          )}
        />
      </div>

      {open && results.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-1 z-50 rounded-xl border border-line bg-surface-elevated shadow-lg overflow-hidden">
          {results.map(r => (
            <button
              key={r.id}
              onClick={() => handleAdd(r)}
              disabled={isPending}
              className="flex w-full items-center gap-3 px-3 py-2.5 hover:bg-surface-raised text-left transition-colors"
            >
              <MiniAvatar name={r.name} url={r.avatarUrl} />
              <div className="min-w-0">
                <p className="text-sm font-medium text-ink truncate">{r.name}</p>
                <p className="text-xs text-ink-subtle truncate">{r.email}</p>
              </div>
              <UserPlus2 className="h-3.5 w-3.5 text-ink-subtle ml-auto shrink-0" />
            </button>
          ))}
        </div>
      )}

      {open && query.trim() && !loading && results.length === 0 && (
        <div className="absolute left-0 right-0 top-full mt-1 z-50 rounded-xl border border-line bg-surface-elevated shadow-lg">
          <p className="px-3 py-3 text-sm text-ink-subtle">No players found</p>
        </div>
      )}
    </div>
  )
}

// ─── Single group card ────────────────────────────────────────────────────────

function GroupCard({
  group,
  onDeleted,
  onMembersChanged,
}: {
  group:            FriendGroupWithMembers
  onDeleted:        (id: string) => void
  onMembersChanged: (id: string) => void
}) {
  const [isPending, startTransition] = useTransition()
  const [confirmDelete, setConfirmDelete] = useState(false)

  function handleDelete() {
    if (!confirmDelete) { setConfirmDelete(true); return }
    startTransition(async () => {
      await deleteFriendGroup(group.id)
      onDeleted(group.id)
    })
  }

  function handleRemoveMember(memberId: string) {
    startTransition(async () => {
      await removeFromGroup(group.id, memberId)
      onMembersChanged(group.id)
    })
  }

  return (
    <div className="rounded-xl border border-line bg-surface-raised p-4">
      {/* Group header */}
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-gold" />
          <h3 className="font-semibold text-ink">{group.name}</h3>
          <span className="text-xs text-ink-subtle">({group.members.length})</span>
        </div>
        <button
          onClick={handleDelete}
          disabled={isPending}
          aria-label={confirmDelete ? 'Confirm delete group' : 'Delete group'}
          className={cn(
            'rounded-md p-1 text-xs transition-colors disabled:opacity-40',
            confirmDelete
              ? 'text-loss hover:bg-loss/10'
              : 'text-ink-subtle hover:text-loss hover:bg-loss/10',
          )}
        >
          {confirmDelete ? 'Confirm?' : <Trash2 className="h-3.5 w-3.5" />}
        </button>
      </div>

      {/* Members list */}
      {group.members.length > 0 ? (
        <div className="flex flex-col gap-1.5 mb-3">
          {group.members.map(m => (
            <div key={m.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 bg-surface-base">
              <MiniAvatar name={m.name} url={m.avatarUrl} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-ink truncate">{m.name}</p>
              </div>
              <button
                onClick={() => handleRemoveMember(m.id)}
                disabled={isPending}
                aria-label={`Remove ${m.name}`}
                className="rounded-md p-0.5 text-ink-subtle hover:text-loss hover:bg-loss/10 transition-colors disabled:opacity-40"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-ink-subtle mb-3 py-1">No members yet — add some below.</p>
      )}

      {/* Add player */}
      <PlayerSearchInput
        groupId={group.id}
        existingIds={group.members.map(m => m.playerId)}
        onAdded={() => onMembersChanged(group.id)}
      />
    </div>
  )
}

// ─── Main manager ─────────────────────────────────────────────────────────────

export function FriendGroupsManager({
  initialGroups,
  className,
}: FriendGroupsManagerProps) {
  const [groups,   setGroups]   = useState<FriendGroupWithMembers[]>(initialGroups)
  const [newName,  setNewName]  = useState('')
  const [creating, setCreating] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleCreate() {
    if (!newName.trim()) return
    startTransition(async () => {
      try {
        setCreating(true)
        // Optimistically add — server will revalidate
        await createFriendGroup(newName)
        // Reload groups from server by triggering re-render via router refresh would be ideal;
        // for now we'll just add a skeleton that gets replaced on next SSR load.
        // Simple approach: push a placeholder and let the user see it immediately.
        setGroups(prev => [
          ...prev,
          {
            id:        `temp-${Date.now()}`,
            name:      newName.trim(),
            createdAt: new Date(),
            updatedAt: new Date(),
            members:   [],
          },
        ])
        setNewName('')
      } finally {
        setCreating(false)
      }
    })
  }

  function handleDeleted(id: string) {
    setGroups(prev => prev.filter(g => g.id !== id))
  }

  function handleMembersChanged(id: string) {
    // Trigger a soft reload of this group's data
    // Since we're in a client component, we reload the full page data via router
    // A simple workaround: force a window reload so server refetches
    window.location.reload()
  }

  return (
    <div className={cn('flex flex-col gap-5', className)}>
      {/* Create new group */}
      <div className="rounded-xl border border-line bg-surface-raised p-4">
        <h3 className="mb-3 text-sm font-semibold text-ink flex items-center gap-2">
          <Plus className="h-4 w-4 text-gold" />
          Create a group
        </h3>
        <div className="flex gap-2">
          <input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCreate()}
            placeholder="Group name…"
            maxLength={60}
            className={cn(
              'flex-1 rounded-lg border border-line bg-surface-base px-3 py-2 text-sm text-ink',
              'placeholder:text-ink-subtle focus:outline-none focus:ring-1 focus:ring-gold/40',
            )}
          />
          <Button
            size="sm"
            onClick={handleCreate}
            disabled={!newName.trim() || isPending || creating}
            isLoading={creating}
          >
            Create
          </Button>
        </div>
      </div>

      {/* Groups list */}
      {groups.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-line bg-surface-raised py-12 text-center">
          <Users className="h-10 w-10 text-ink-subtle/40" />
          <p className="text-sm text-ink-muted">No groups yet.</p>
          <p className="text-xs text-ink-subtle">Create one above to start organising your friends.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {groups.map(group => (
            <GroupCard
              key={group.id}
              group={group}
              onDeleted={handleDeleted}
              onMembersChanged={handleMembersChanged}
            />
          ))}
        </div>
      )}
    </div>
  )
}
