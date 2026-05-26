import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { db }           from '@/lib/db'
import type { SessionUser } from '@/types'

/**
 * Resolve the current session user from the Supabase JWT + our players table.
 *
 * `cache()` memoises the result per React render tree so multiple Server
 * Components on the same page only hit the DB once.
 *
 * Returns null if not authenticated or if the player profile doesn't exist.
 */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const supabase = createClient()

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) return null

  const player = await db.player.findUnique({
    where: { supabaseUid: user.id },
    select: { id: true, email: true, name: true, role: true, avatarUrl: true },
  })

  if (!player) return null

  return {
    id:          player.id,
    supabaseUid: user.id,
    email:       player.email,
    name:        player.name,
    role:        player.role,
    avatarUrl:   player.avatarUrl,
  }
})

/**
 * Same as getSessionUser but throws if not authenticated.
 * Use in Server Actions that require authentication.
 */
export async function requireSessionUser(): Promise<SessionUser> {
  const user = await getSessionUser()
  if (!user) throw new Error('Unauthorized')
  return user
}
