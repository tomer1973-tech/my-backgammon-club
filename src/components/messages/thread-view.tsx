'use client'

import { useState, useEffect, useRef, useTransition } from 'react'
import Link from 'next/link'
import { ArrowLeft, Send, MessageCircle } from 'lucide-react'
import { Avatar } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import { EmojiPicker } from '@/components/messages/emoji-picker'
import { getConversation, sendMessage, type ConversationMessage } from '@/actions/messages'

const POLL_INTERVAL_MS = 4000

interface ThreadViewProps {
  targetId:        string
  targetName:      string
  targetAvatar:    string | null
  initialMessages: ConversationMessage[]
}

function formatTime(date: Date): string {
  return new Date(date).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

function formatDayLabel(date: Date): string {
  const d = new Date(date)
  const today = new Date()
  const isSameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString()
  if (isSameDay(d, today)) return 'Today'
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1)
  if (isSameDay(d, yesterday)) return 'Yesterday'
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

export function ThreadView({ targetId, targetName, targetAvatar, initialMessages }: ThreadViewProps) {
  const [messages, setMessages] = useState(initialMessages)
  const [body, setBody]         = useState('')
  const [error, setError]       = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const bottomRef   = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' })
  }, [messages.length])

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        setMessages(await getConversation(targetId))
      } catch {
        // Transient network hiccup — next interval tick will retry.
      }
    }, POLL_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [targetId])

  function handleSend() {
    const text = body.trim()
    if (!text) return
    setError(null)
    setBody('')
    startTransition(async () => {
      const res = await sendMessage(targetId, text)
      if (res.success) {
        setMessages(await getConversation(targetId))
      } else {
        setError(res.error)
        setBody(text)
      }
    })
  }

  function insertEmoji(emoji: string) {
    setBody(b => b + emoji)
    textareaRef.current?.focus()
  }

  // Group consecutive messages by day, for date dividers.
  const groups: { day: string; items: ConversationMessage[] }[] = []
  for (const m of messages) {
    const day = formatDayLabel(m.createdAt)
    const last = groups[groups.length - 1]
    if (last && last.day === day) last.items.push(m)
    else groups.push({ day, items: [m] })
  }

  return (
    <div className="mx-auto flex h-[calc(100dvh-9rem)] w-full max-w-2xl flex-col animate-fade-in md:h-[calc(100dvh-6rem)]">
      {/* Header */}
      <div className="flex items-center gap-3 rounded-2xl border border-line bg-surface-raised px-4 py-3">
        <Link
          href="/messages"
          className="rounded-full p-1.5 text-ink-subtle transition-colors hover:bg-surface-elevated hover:text-ink"
          aria-label="Back to messages"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <Avatar name={targetName} src={targetAvatar} size="sm" />
        <Link href={`/players/${targetId}`} className="font-semibold text-ink hover:underline">
          {targetName}
        </Link>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-1 py-4">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-gold/10 text-gold">
              <MessageCircle className="h-6 w-6" />
            </span>
            <p className="text-sm font-medium text-ink">No messages yet</p>
            <p className="text-xs text-ink-subtle">Say hi to {targetName} 👋</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {groups.map((group, gi) => (
              <div key={gi} className="flex flex-col gap-1.5">
                <div className="flex items-center justify-center">
                  <span className="rounded-full bg-surface-raised px-3 py-1 text-[10px] font-medium uppercase tracking-wide text-ink-subtle">
                    {group.day}
                  </span>
                </div>
                {group.items.map(m => (
                  <div key={m.id} className={cn('flex items-end gap-2', m.mine ? 'justify-end' : 'justify-start')}>
                    {!m.mine && <Avatar name={targetName} src={targetAvatar} size="sm" className="h-6 w-6 shrink-0 text-[10px]" />}
                    <div className={cn(
                      'max-w-[72%] rounded-2xl px-3.5 py-2 text-sm shadow-sm',
                      m.mine
                        ? 'rounded-br-md bg-gold text-surface-canvas'
                        : 'rounded-bl-md bg-surface-raised text-ink',
                    )}>
                      <p className="whitespace-pre-wrap break-words">{m.body}</p>
                      <p className={cn('mt-0.5 text-right text-[10px]', m.mine ? 'text-surface-canvas/70' : 'text-ink-subtle')}>
                        {formatTime(m.createdAt)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Composer */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-end gap-2 rounded-3xl border border-line bg-surface-raised p-1.5 pl-4 focus-within:border-gold/40">
          <textarea
            ref={textareaRef}
            value={body}
            onChange={e => setBody(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
            }}
            placeholder={`Message ${targetName}…`}
            rows={1}
            maxLength={1000}
            className="flex-1 resize-none bg-transparent py-2 text-sm text-ink placeholder:text-ink-subtle focus:outline-none"
          />
          <EmojiPicker onSelect={insertEmoji} />
          <button
            onClick={handleSend}
            disabled={pending || !body.trim()}
            aria-label="Send message"
            className={cn(
              'flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-all',
              body.trim() && !pending
                ? 'bg-gold text-surface-canvas hover:bg-gold-bright'
                : 'bg-surface-elevated text-ink-subtle',
            )}
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
        {error && <p className="px-2 text-xs text-loss">{error}</p>}
      </div>
    </div>
  )
}
