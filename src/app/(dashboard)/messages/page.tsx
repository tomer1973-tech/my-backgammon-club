/**
 * /messages — Direct message inbox (conversation list).
 */

import type { Metadata } from 'next'
import { MessageCircle } from 'lucide-react'
import { getConversations } from '@/actions/messages'
import { ConversationsList } from '@/components/messages/conversations-list'

export const metadata: Metadata = { title: 'Messages — My Backgammon Club' }
export const dynamic = 'force-dynamic'

export default async function MessagesPage() {
  const conversations = await getConversations()

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 animate-fade-in">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-ink">
          <MessageCircle className="h-6 w-6 text-gold" />
          Messages
        </h1>
        <p className="mt-0.5 text-sm text-ink-muted">Direct messages with other players</p>
      </div>

      <ConversationsList initialConversations={conversations} />
    </div>
  )
}
