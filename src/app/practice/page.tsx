import type { Metadata } from 'next'
import { PracticeClient } from '@/components/practice/practice-client'
import { getSessionUser } from '@/lib/session'

export const metadata: Metadata = { title: 'Practice vs AI' }

export default async function PracticePage() {
  const currentUser = await getSessionUser()
  return <PracticeClient currentUser={currentUser} />
}
