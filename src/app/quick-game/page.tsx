import type { Metadata } from 'next'
import { QuickGameClient } from '@/components/quick-game/quick-game-client'
import { getSessionUser }  from '@/lib/session'

export const metadata: Metadata = { title: 'Quick Game' }

export default async function QuickGamePage() {
  const currentUser = await getSessionUser()
  return <QuickGameClient currentUser={currentUser} />
}
