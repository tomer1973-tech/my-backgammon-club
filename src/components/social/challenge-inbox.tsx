'use client'

/**
 * ChallengeInbox — global listener mounted in AppShell.
 *
 * Polls for pending incoming challenges every few seconds and shows a modal
 * with Accept/Decline. Accepting routes both players into the live game.
 */

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Swords } from 'lucide-react'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Dialog, DialogFooter } from '@/components/ui/dialog'
import { getPendingIncomingChallenges, respondChallenge, type IncomingChallenge } from '@/actions/challenge'

const POLL_INTERVAL_MS = 5000

export function ChallengeInbox() {
  const router = useRouter()
  const [queue, setQueue]   = useState<IncomingChallenge[]>([])
  const [error, setError]   = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    let cancelled = false

    async function poll() {
      try {
        const rows = await getPendingIncomingChallenges()
        if (cancelled) return
        setQueue(prev => {
          if (prev.length === rows.length && prev.every((p, i) => p.id === rows[i].id)) return prev
          return rows
        })
      } catch {
        // Transient network/session hiccup — next interval tick will retry.
      }
    }

    poll()
    const interval = setInterval(poll, POLL_INTERVAL_MS)
    return () => { cancelled = true; clearInterval(interval) }
  }, [])

  const current = queue[0]
  if (!current) return null

  function respond(accept: boolean) {
    setError(null)
    startTransition(async () => {
      try {
        const res = await respondChallenge(current.id, accept)
        if (accept && res.success && res.data) {
          setQueue(q => q.slice(1))
          router.push(`/tournaments/${res.data.tournamentId}/matches/${res.data.matchId}/live`)
        } else if (!res.success) {
          // Keep the dialog open with the error visible — don't silently drop the challenge.
          setError(res.error)
        } else {
          setQueue(q => q.slice(1))
        }
      } catch {
        setError("Couldn't reach the server. Check your connection and try again.")
      }
    })
  }

  return (
    <Dialog open onClose={() => {}} title="Challenge!">
      <div className="flex items-center gap-3 py-2">
        <Avatar name={current.fromName} src={current.fromAvatar} />
        <p className="text-sm text-ink-muted">
          <span className="font-semibold text-ink">{current.fromName}</span> challenged you to a live backgammon match.
        </p>
      </div>
      {error && (
        <p className="rounded-lg border border-loss/30 bg-loss/5 px-3 py-2 text-xs font-medium text-loss">
          {error}
        </p>
      )}
      <DialogFooter>
        <Button variant="secondary" onClick={() => respond(false)} disabled={pending}>
          Decline
        </Button>
        <Button onClick={() => respond(true)} disabled={pending} className="gap-1.5">
          <Swords className="h-3.5 w-3.5" />
          Accept &amp; Play
        </Button>
      </DialogFooter>
    </Dialog>
  )
}
