import type { Metadata } from 'next'
import { QuickGameClient } from '@/components/quick-game/quick-game-client'

export const metadata: Metadata = { title: 'Quick Game' }

export default function QuickGamePage() {
  return <QuickGameClient />
}
