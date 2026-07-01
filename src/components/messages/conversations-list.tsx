'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { MessageCircle } from 'lucide-react'
import { Avatar } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import { getConversations, type ConversationSummary } from '@/actions/messages'

const POLL_INTERVAL_MS = 7000

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (seconds < 60) return 'now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  return `${days}d`
}

export function ConversationsList({ initialConversations }: { initialConversations: ConversationSummary[] }) {
  const [conversations, setConversations] = useState(initialConversations)

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        setConversations(await getConversations())
      } catch {
        // Transient network hiccup — next interval tick will retry.
      }
    }, POLL_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [])

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-line bg-surface-raised py-14 text-center">
        <MessageCircle className="h-10 w-10 text-ink-subtle/40" />
        <p className="text-sm text-ink-muted">
          No conversations yet. Message someone from the{' '}
          <Link href="/players" className="text-gold hover:underline">Players</Link> page to start one.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {conversations.map(c => (
        <Link
          key={c.playerId}
          href={`/messages/${c.playerId}`}
          className="flex items-center gap-3 rounded-xl border border-line bg-surface-raised px-4 py-3 transition-colors hover:bg-surface-elevated"
        >
          <Avatar name={c.playerName} src={c.playerAvatar} />
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium text-ink">{c.playerName}</p>
            <p className={cn('truncate text-xs', c.unreadCount > 0 ? 'text-ink font-medium' : 'text-ink-subtle')}>
              {c.lastMessage}
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            <span className="text-xs text-ink-subtle">{timeAgo(c.lastAt)}</span>
            {c.unreadCount > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-gold px-1 text-[10px] font-bold text-surface-canvas">
                {c.unreadCount > 9 ? '9+' : c.unreadCount}
              </span>
            )}
          </div>
        </Link>
      ))}
    </div>
  )
}
