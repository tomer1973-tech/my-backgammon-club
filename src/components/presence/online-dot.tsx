'use client'

import { usePresence } from './presence-provider'
import { cn } from '@/lib/utils'

export function useIsOnline(playerId: string): boolean {
  const online = usePresence()
  return online.has(playerId)
}

interface OnlineDotProps {
  playerId:  string
  className?: string
}

/** Small green dot rendered only when the given player is currently online. */
export function OnlineDot({ playerId, className }: OnlineDotProps) {
  const isOnline = useIsOnline(playerId)
  if (!isOnline) return null
  return (
    <span
      title="Online"
      className={cn('inline-block h-2 w-2 rounded-full bg-win ring-2 ring-surface-raised', className)}
    />
  )
}
