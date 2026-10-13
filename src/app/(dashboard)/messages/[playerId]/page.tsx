/**
 * /messages/[playerId] — 1-on-1 message thread.
 */

import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getPlayerProfile } from '@/actions/profile'
import { getConversation } from '@/actions/messages'
import { ThreadView } from '@/components/messages/thread-view'

export const dynamic = 'force-dynamic'

export async function generateMetadata(props: { params: Promise<{ playerId: string }> }): Promise<Metadata> {
  const params = await props.params;
  const profile = await getPlayerProfile(params.playerId)
  return { title: profile ? `${profile.name} — Messages` : 'Messages — My Backgammon Club' }
}

export default async function MessageThreadPage(props: { params: Promise<{ playerId: string }> }) {
  const params = await props.params;
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
