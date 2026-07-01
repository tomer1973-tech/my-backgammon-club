/**
 * /messages/[playerId] — 1-on-1 message thread.
 */

import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getPlayerProfile } from '@/actions/profile'
import { getConversation } from '@/actions/messages'
import { ThreadView } from '@/components/messages/thread-view'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: { playerId: string } }): Promise<Metadata> {
  const profile = await getPlayerProfile(params.playerId)
  return { title: profile ? `${profile.name} — Messages` : 'Messages — My Backgammon Club' }
}

export default async function MessageThreadPage({ params }: { params: { playerId: string } }) {
  const profile = await getPlayerProfile(params.playerId)
  if (!profile) notFound()

  const messages = await getConversation(params.playerId)

  return (
    <ThreadView
      targetId={profile.id}
      targetName={profile.name}
      targetAvatar={profile.avatarUrl}
      initialMessages={messages}
    />
  )
}
