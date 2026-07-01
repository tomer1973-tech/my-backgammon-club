'use client'

/**
 * RematchButton — shown on a completed match. Lets either participant start
 * a fresh match against the same opponent, picking the race-to length first
 * (defaults to whatever the finished match used).
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Swords } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { rematchMatch } from '@/actions/match'

const MAX_TARGET_SCORE = 25

interface RematchButtonProps {
  matchId:             string
  tournamentId:        string
  defaultTargetScore:  number
}

export function RematchButton({ matchId, tournamentId, defaultTargetScore }: RematchButtonProps) {
  const router = useRouter()
  const [open, setOpen]               = useState(false)
  const [scoreInput, setScoreInput]   = useState(String(defaultTargetScore))
  const [creating, setCreating]       = useState(false)
  const [error, setError]             = useState<string | null>(null)

  const targetScore = parseInt(scoreInput, 10)
  const scoreValid = Number.isInteger(targetScore) && targetScore >= 1 && targetScore <= MAX_TARGET_SCORE

  async function handleStart() {
    if (!scoreValid) { setError(`Race length must be between 1 and ${MAX_TARGET_SCORE}.`); return }
    setCreating(true)
    setError(null)
    const result = await rematchMatch(matchId, targetScore)
    if (result.success) {
      router.push(`/tournaments/${tournamentId}/matches/${result.data.id}`)
    } else {
      setError(result.error)
      setCreating(false)
    }
  }

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)} size="lg" className="w-full gap-2">
        <Swords className="h-5 w-5" />
        Rematch
      </Button>
    )
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-line bg-surface-raised p-4">
      <Input
        label={`Race to (1–${MAX_TARGET_SCORE} points)`}
        type="number"
        inputMode="numeric"
        min={1}
        max={MAX_TARGET_SCORE}
        value={scoreInput}
        onChange={e => setScoreInput(e.target.value)}
        error={!scoreValid && scoreInput !== '' ? `Enter a number from 1 to ${MAX_TARGET_SCORE}.` : undefined}
      />
      {error && (
        <p className="rounded-lg border border-loss/40 bg-loss/10 px-3 py-2 text-sm text-loss">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <Button variant="ghost" onClick={() => setOpen(false)} disabled={creating} className="flex-1">
          Cancel
        </Button>
        <Button onClick={handleStart} isLoading={creating} disabled={!scoreValid} className="flex-1 gap-2">
          <Swords className="h-4 w-4" />
          Start rematch{scoreValid ? ` — Race to ${targetScore}` : ''}
        </Button>
      </div>
    </div>
  )
}
