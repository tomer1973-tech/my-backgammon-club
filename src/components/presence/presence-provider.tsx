'use client'

/**
 * PresenceProvider — tracks which players currently have the app open.
 *
 * Uses Supabase Realtime Presence on a single shared channel. Every signed-in
 * client "tracks" itself under its player id; every client also receives the
 * full online set on every join/leave. No database table or extra Supabase
 * config is required — presence is broadcast-only and ephemeral.
 */

import { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const PresenceContext = createContext<Set<string>>(new Set())

export function usePresence() {
  return useContext(PresenceContext)
}

interface PresenceProviderProps {
  userId:         string
  appearOffline?: boolean
  children:       React.ReactNode
}

export function PresenceProvider({ userId, appearOffline = false, children }: PresenceProviderProps) {
  const [online, setOnline] = useState<Set<string>>(new Set())

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase.channel('presence:lobby', {
      config: { presence: { key: userId } },
    })

    channel
      .on('presence', { event: 'sync' }, () => {
        setOnline(new Set(Object.keys(channel.presenceState())))
      })
      .subscribe(async status => {
        // Still join the channel so we receive everyone else's presence —
        // just skip tracking ourselves when "appear offline" is on, so we
        // never show up in anyone else's online set.
        if (status === 'SUBSCRIBED' && !appearOffline) {
          await channel.track({ online_at: new Date().toISOString() })
        }
      })

    return () => { supabase.removeChannel(channel) }
  }, [userId, appearOffline])

  return <PresenceContext.Provider value={online}>{children}</PresenceContext.Provider>
}
