'use client'

/**
 * MessageToast — global listener mounted in AppShell. Pops a small
 * dismissable toast the moment a new incoming message arrives, without
 * interrupting the page (unlike ChallengeInbox's blocking modal).
 *
 * Rides on the shared unread count from UnreadMessagesProvider (already
 * polled once for the whole app) instead of running its own poll loop —
 * the heavier getConversations() query only runs the moment the count
 * actually goes up, to find out who to show in the toast.
 */

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { MessageCircle, X } from 'lucide-react'
import { Avatar } from '@/components/ui/avatar'
import { getConversations, type ConversationSummary } from '@/actions/messages'
import { useUnreadMessages } from '@/components/messages/unread-messages-provider'

export function MessageToast() {
  const unreadCount = useUnreadMessages()
  const [toast, setToast] = useState<ConversationSummary | null>(null)
  const lastCountRef = useRef<number | null>(null)

  useEffect(() => {
    // First render just establishes the baseline — no toast on initial load.
    if (lastCountRef.current === null) {
      lastCountRef.current = unreadCount
      return
    }
    if (unreadCount > lastCountRef.current) {
      getConversations().then(rows => {
        const newest = rows.find(r => r.unreadCount > 0)
        if (newest) {
          setToast(newest)
          setTimeout(() => setToast(t => (t?.playerId === newest.playerId ? null : t)), 5000)
        }
      }).catch(() => { /* transient — skip this toast, next poll tick will catch up */ })
    }
    lastCountRef.current = unreadCount
  }, [unreadCount])

  if (!toast) return null

  return (
    <Link
      href={`/messages/${toast.playerId}`}
      onClick={() => setToast(null)}
      className="fixed bottom-20 right-4 z-50 flex max-w-xs items-center gap-3 rounded-2xl border border-line bg-surface-elevated px-4 py-3 shadow-elevated md:bottom-6 md:right-6"
    >
      <Avatar name={toast.playerName} src={toast.playerAvatar} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 text-sm font-semibold text-ink">
          <MessageCircle className="h-3.5 w-3.5 text-gold" />
          {toast.playerName}
        </p>
        <p className="truncate text-xs text-ink-subtle">{toast.lastMessage}</p>
      </div>
      <button
        onClick={e => { e.preventDefault(); e.stopPropagation(); setToast(null) }}
        className="shrink-0 rounded-md p-1 text-ink-subtle hover:bg-surface-subtle/40 hover:text-ink"
        aria-label="Dismiss"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </Link>
  )
}
