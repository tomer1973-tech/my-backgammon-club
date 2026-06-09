'use server'

/**
 * Quick Match Server Actions
 *
 * Lightweight player search for the Quick Game feature.
 * No tournament context — just name / email lookup.
 */

import { db }                 from '@/lib/db'
import { requireSessionUser } from '@/lib/session'
import type { ActionResult }  from '@/types'

export type QuickMatchPlayer = {
  id:        string
  name:      string
  avatarUrl: string | null
}

/**
 * Search registered players by name or email.
 * Returns up to 8 results. Caller is responsible for filtering out
 * players already on the local roster.
 */
export async function searchRegisteredPlayers(
  query: string,
): Promise<ActionResult<QuickMatchPlayer[]>> {
  await requireSessionUser()   // must be logged in (lobby is authenticated)

  const q = query.trim()
  if (q.length < 2) return { success: true, data: [] }

  const players = await db.player.findMany({
    where: {
      OR: [
        { name:  { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
      ],
    },
    select: { id: true, name: true, avatarUrl: true },
    take:   8,
    orderBy: { name: 'asc' },
  })

  return {
    success: true,
    data: players.map(p => ({ id: p.id, name: p.name, avatarUrl: p.avatarUrl })),
  }
}
