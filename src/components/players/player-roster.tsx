'use client'

/**
 * PlayerRoster — full roster list with add-player control for organizers.
 */

import { useState }         from 'react'
import { UserPlus }         from 'lucide-react'
import { Button }           from '@/components/ui/button'
import { PlayerCard }       from './player-card'
import { AddPlayerDialog }  from './add-player-dialog'
import type { Member }      from '@/types'

interface PlayerRosterProps {
  members:      Member[]
  tournamentId: string
  canManage?:   boolean
}

export function PlayerRoster({ members, tournamentId, canManage = false }: PlayerRosterProps) {
  const [addOpen, setAddOpen] = useState(false)

  // Sort: organizers first, then by points desc
  const sorted = [...members].sort((a, b) => {
    if (a.memberRole === 'ORGANIZER' && b.memberRole !== 'ORGANIZER') return -1
    if (b.memberRole === 'ORGANIZER' && a.memberRole !== 'ORGANIZER') return 1
    return b.points - a.points
  })

  return (
    <div className="rounded-xl border border-line bg-surface-raised p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-ink">Players</h2>
          <p className="text-xs text-ink-subtle">{members.length} registered</p>
        </div>
        {canManage && (
          <Button size="sm" variant="secondary" onClick={() => setAddOpen(true)} className="gap-1.5">
            <UserPlus className="h-3.5 w-3.5" />
            Add player
          </Button>
        )}
      </div>

      {/* List */}
      {sorted.length === 0 ? (
        <div className="py-8 text-center">
          <p className="text-sm text-ink-subtle">No players yet.</p>
          {canManage && (
            <p className="mt-1 text-xs text-ink-subtle">
              Add players or share the join code.
            </p>
          )}
        </div>
      ) : (
        <div className="divide-y divide-line/40">
          {sorted.map((member, i) => (
            <PlayerCard
              key={member.id}
              member={member}
              tournamentId={tournamentId}
              canManage={canManage}
            />
          ))}
        </div>
      )}

      {/* Add player dialog */}
      <AddPlayerDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        tournamentId={tournamentId}
      />
    </div>
  )
}
