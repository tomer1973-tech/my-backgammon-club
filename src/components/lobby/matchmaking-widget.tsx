'use client'

/**
 * MatchmakingWidget — "Find Opponent" rated queue entry point for the lobby.
 *
 * Joining starts a poll loop (server pairs opportunistically — see
 * actions/matchmaking.ts). On a match, redirects both players into the
 * existing live-game screen.
 */

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Swords, Loader2, X, Bot, UserPlus2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { joinMatchmakingQueue, leaveMatchmakingQueue, pollMatchmaking } from '@/actions/matchmaking'

const POLL_INTERVAL_MS = 2500

export function MatchmakingWidget() {
  const router = useRouter()
  const [rating, setRating]       = useState<number | null>(null)
  const [searching, setSearching] = useState(false)
  const [timedOut, setTimedOut]   = useState(false)
  const [waitedMs, setWaitedMs]   = useState(0)
  const [error, setError]         = useState<string | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    pollMatchmaking().then(res => {
      if (res.success) {
        setRating(res.data.rating)
        if (res.data.state === 'waiting') { setSearching(true); startPolling() }
      }
    })
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function startPolling() {
    intervalRef.current = setInterval(async () => {
      const res = await pollMatchmaking()
      if (!res.success) { setError(res.error); return }
      if (res.data.state === 'matched' && res.data.tournamentId && res.data.matchId) {
        if (intervalRef.current) clearInterval(intervalRef.current)
        router.push(`/tournaments/${res.data.tournamentId}/matches/${res.data.matchId}/live`)
      } else if (res.data.state === 'waiting') {
        setWaitedMs(res.data.waitedMs ?? 0)
      } else if (res.data.state === 'idle' && res.data.timedOut) {
        if (intervalRef.current) clearInterval(intervalRef.current)
        setSearching(false)
        setTimedOut(true)
      }
    }, POLL_INTERVAL_MS)
  }

  async function handleFindOpponent() {
    setError(null)
    setTimedOut(false)
    setWaitedMs(0)
    setSearching(true)
    const res = await joinMatchmakingQueue()
    if (!res.success) { setError(res.error); setSearching(false); return }
    if (res.data.state === 'matched' && res.data.tournamentId && res.data.matchId) {
      router.push(`/tournaments/${res.data.tournamentId}/matches/${res.data.matchId}/live`)
      return
    }
    startPolling()
  }

  async function handleCancel() {
    if (intervalRef.current) clearInterval(intervalRef.current)
    setSearching(false)
    setWaitedMs(0)
    await leaveMatchmakingQueue()
  }

  const seconds = Math.floor(waitedMs / 1000)

  return (
    <div className="glossy rounded-2xl border-2 border-line bg-surface-raised overflow-hidden relative">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0
          bg-[radial-gradient(ellipse_80%_100%_at_50%_0%,hsl(214_72%_34%/0.10),transparent)]"
      />
      <div className="relative p-4 sm:p-6">
        <div className="flex items-center gap-2 mb-1">
          <Swords className="h-4 w-4 text-ink-muted" />
          <span className="text-xs font-bold uppercase tracking-widest text-ink-muted">Ranked Match</span>
          {rating !== null && (
            <span className="rounded-full bg-surface-elevated border border-line px-2 py-0.5 text-[10px] font-bold text-ink-subtle">
              Rating {rating}
            </span>
          )}
        </div>

        {timedOut ? (
          <>
            <h2 className="text-xl sm:text-2xl font-bold text-ink mt-1">No one's online right now</h2>
            <p className="text-sm text-ink-muted mt-1 mb-4">
              Nobody matched your skill range in time. Try again, warm up against the AI, or invite a friend instead.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button onClick={handleFindOpponent} size="lg" className="gap-2">
                <Swords className="h-4 w-4" />
                Try Again
              </Button>
              <Link href="/practice">
                <Button variant="secondary" size="lg" className="gap-2">
                  <Bot className="h-4 w-4" />
                  Practice vs AI
                </Button>
              </Link>
              <Link href="/players">
                <Button variant="secondary" size="lg" className="gap-2">
                  <UserPlus2 className="h-4 w-4" />
                  Invite a Friend
                </Button>
              </Link>
            </div>
          </>
        ) : !searching ? (
          <>
            <h2 className="text-xl sm:text-2xl font-bold text-ink mt-1">Find an opponent online</h2>
            <p className="text-sm text-ink-muted mt-1 mb-4">
              Get paired with another player near your skill level for a rated 1-on-1 match.
            </p>
            <Button onClick={handleFindOpponent} size="lg" className="gap-2">
              <Swords className="h-4 w-4" />
              Find Opponent
            </Button>
          </>
        ) : (
          <>
            <h2 className="text-xl sm:text-2xl font-bold text-ink mt-1 flex items-center gap-2.5">
              <span className="relative flex h-7 w-7 items-center justify-center rounded-full border-2 border-gold/20 shrink-0">
                <Loader2 className="h-5 w-5 animate-spin text-gold" strokeWidth={2.5} />
              </span>
              Searching for an opponent…
            </h2>
            <p className="text-sm text-ink-muted mt-1 mb-4">
              {seconds < 10
                ? 'Looking for a close skill match…'
                : seconds < 60
                  ? 'Widening the search to find you a game faster…'
                  : "Still looking — we'll stop automatically soon if no one's around."}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button onClick={handleCancel} variant="secondary" className="gap-2">
                <X className="h-4 w-4" />
                Cancel
              </Button>
              <Link href="/practice">
                <Button variant="ghost" className="gap-2">
                  <Bot className="h-4 w-4" />
                  Practice vs AI
                </Button>
              </Link>
              <Link href="/players">
                <Button variant="ghost" className="gap-2">
                  <UserPlus2 className="h-4 w-4" />
                  Invite a Friend
                </Button>
              </Link>
            </div>
          </>
        )}

        {error && (
          <p className="mt-3 text-xs font-medium text-loss">{error}</p>
        )}
      </div>
    </div>
  )
}
