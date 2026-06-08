/**
 * /groups — Friend Groups
 *
 * Shows the current user's friend groups and lets them manage membership.
 * Server Component — data fetched fresh on every visit.
 */

import type { Metadata } from 'next'
import { Users2 }        from 'lucide-react'
import { getMyGroups }   from '@/actions/social'
import { FriendGroupsManager } from '@/components/social/friend-groups-manager'

export const metadata: Metadata = { title: 'Friend Groups — My Backgammon Club' }
export const dynamic = 'force-dynamic'

export default async function GroupsPage() {
  const groups = await getMyGroups()

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-ink">
          <Users2 className="h-6 w-6 text-gold" />
          Friend Groups
        </h1>
        <p className="mt-0.5 text-sm text-ink-muted">
          Organise players into named groups for easy tracking.
        </p>
      </div>

      <FriendGroupsManager initialGroups={groups} />
    </div>
  )
}
