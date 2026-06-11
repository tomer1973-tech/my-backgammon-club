import type { Metadata } from 'next'
import { PlayClient }     from '@/components/play/play-client'
import { getSessionUser } from '@/lib/session'

export const metadata: Metadata = { title: 'Play Backgammon' }

export default async function PlayPage() {
  const currentUser = await getSessionUser()
  return <PlayClient currentUser={currentUser} />
}
