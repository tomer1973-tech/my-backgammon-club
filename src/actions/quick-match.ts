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

/**
 * Save quick-game win/loss stats to registered player profiles.
 *
 * - Only updates players whose IDs are valid UUIDs (registered accounts).
 *   Guest IDs ('guest:…') and local temp IDs ('local:…') are silently skipped.
 * - Returns { success: false, error: 'not-signed-in' } if the caller has
 *   no active session, so the client can show a sign-in prompt instead of
 *   crashing.
 */
export async function saveQuickGameResult(
  winnerPlayerId: string,
  loserPlayerId:  string,
): Promise<ActionResult<{ savedCount: number }>> {
  // Auth is optional on the quick-game page — return a typed error rather
  // than throwing so the client can decide how to surface it.
  try {
    await requireSessionUser()
  } catch {
    return { success: false, error: 'not-signed-in' }
  }

  // A UUID from the player DB looks like xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
  const isUUID = (id: string) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)

  const tasks: Promise<unknown>[] = []

  if (isUUID(winnerPlayerId)) {
    tasks.push(
      db.player.update({
        where: { id: winnerPlayerId },
        data:  { quickWins: { increment: 1 } },
      }),
    )
  }

  if (isUUID(loserPlayerId)) {
    tasks.push(
      db.player.update({
        where: { id: loserPlayerId },
        data:  { quickLosses: { increment: 1 } },
      }),
    )
  }

  if (tasks.length > 0) await Promise.all(tasks)

  return { success: true, data: { savedCount: tasks.length } }
}
