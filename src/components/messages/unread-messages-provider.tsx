'use client'

/**
 * UnreadMessagesProvider — polls the unread DM count exactly once for the
 * whole app and shares it via context. SidebarNav and MobileNav are both
 * always mounted (one hidden via CSS per breakpoint, not unmounted), so
 * without this they'd each run their own independent poll loop — silently
 * doubling the DB hits for every signed-in user, all the time.
 */

import { createContext, useContext, useState, useEffect } from 'react'
import { getUnreadMessageCount } from '@/actions/messages'

const POLL_INTERVAL_MS = 10000

const UnreadMessagesContext = createContext(0)

export function UnreadMessagesProvider({ children }: { children: React.ReactNode }) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    let cancelled = false
    async function poll() {
      try {
        const n = await getUnreadMessageCount()
        if (!cancelled) setCount(n)
      } catch {
        // Transient network/session hiccup — next interval tick will retry.
      }
    }
    poll()
    const interval = setInterval(poll, POLL_INTERVAL_MS)
    return () => { cancelled = true; clearInterval(interval) }
  }, [])

  return <UnreadMessagesContext.Provider value={count}>{children}</UnreadMessagesContext.Provider>
}

export function useUnreadMessages() {
  return useContext(UnreadMessagesContext)
}
