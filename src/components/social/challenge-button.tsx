'use client'

import { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Swords, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { sendChallenge, cancelChallenge, getOutgoingChallengeStatus } from '@/actions/challenge'

interface ChallengeButtonProps {
  targetPlayerId: string
  className?:     string
}

/** Lets any player invite any other player to a live 1-on-1 match. */
export function ChallengeButton({ targetPlayerId, className }: ChallengeButtonProps) {
  const router = useRouter()
  const [challengeId, setChallengeId] = useState<string | null>(null)
  const [error, setError]     = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  // `title` tooltips never show on touch devices, so errors are surfaced as
  // visible text below the button instead — auto-dismiss after a few seconds.
  useEffect(() => {
    if (!error) return
    const t = setTimeout(() => setError(null), 4000)
    return () => clearTimeout(t)
  }, [error])

  // Poll for acceptance so the challenger auto-joins the live game too.
  useEffect(() => {
    if (!challengeId) return
    const interval = setInterval(async () => {
      try {
        const res = await getOutgoingChallengeStatus(challengeId)
        if (!res) return
        if (res.status === 'ACCEPTED' && res.tournamentId && res.matchId) {
          router.push(`/tournaments/${res.tournamentId}/matches/${res.matchId}/live`)
        } else if (res.status === 'DECLINED' || res.status === 'CANCELLED') {
          setChallengeId(null)
          setError(res.status === 'DECLINED' ? 'Challenge declined.' : null)
        }
      } catch {
        // Transient network hiccup — next interval tick will retry.
      }
    }, 3000)
    return () => clearInterval(interval)
  }, [challengeId, router])

  function handleInvite() {
    setError(null)
    startTransition(async () => {
      try {
        const res = await sendChallenge(targetPlayerId)
        if (res.success) setChallengeId(res.data.challengeId)
        else setError(res.error)
      } catch {
        setError("Couldn't send the invite — check your connection.")
      }
    })
  }

  function handleCancel() {
    if (!challengeId) return
    startTransition(async () => {
      try {
        await cancelChallenge(challengeId)
      } catch {
        // best-effort — the outgoing-status poll will clean this up either way
      }
      setChallengeId(null)
    })
  }

  return (
    <div className={cn('relative inline-block', className)}>
      {challengeId ? (
        <Button
          size="sm"
          variant="ghost"
          onClick={handleCancel}
          disabled={pending}
          title="Cancel invite"
        >
          <Check className="h-3.5 w-3.5" />
          Invited
          <X className="h-3 w-3 opacity-60" />
        </Button>
      ) : (
        <Button
          size="sm"
          variant="secondary"
          onClick={handleInvite}
          disabled={pending}
        >
          <Swords className="h-3.5 w-3.5" />
          Invite to play
        </Button>
      )}

      {error && (
        <p className="absolute left-0 top-full z-10 mt-1 w-max max-w-[14rem] rounded-lg border border-loss/30 bg-surface-elevated px-2 py-1 text-[11px] font-medium text-loss shadow-elevated">
          {error}
        </p>
      )}
    </div>
  )
}
