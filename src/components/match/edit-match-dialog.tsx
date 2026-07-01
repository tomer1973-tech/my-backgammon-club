'use client'

/**
 * EditMatchDialog — lets the organizer change an in-progress match's race
 * length and rename guest opponents, without having to abandon and recreate
 * the match.
 */

import { useState } from 'react'
import { Dialog, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { updateMatchTargetScore, updateGuestName } from '@/actions/match'

const MAX_TARGET_SCORE = 25

interface EditMatchDialogProps {
  open:           boolean
  onClose:        () => void
  matchId:        string
  targetScore:    number
  player1Id:      string
  player2Id:      string
  player1Name:    string
  player2Name:    string
  player1IsGuest: boolean
  player2IsGuest: boolean
  onSaved: (next: { targetScore: number; player1Name: string; player2Name: string }) => void
}

export function EditMatchDialog({
  open, onClose, matchId, targetScore, player1Id, player2Id,
  player1Name, player2Name, player1IsGuest, player2IsGuest, onSaved,
}: EditMatchDialogProps) {
  const [scoreInput, setScoreInput] = useState(String(targetScore))
  const [p1, setP1]         = useState(player1Name)
  const [p2, setP2]         = useState(player2Name)
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState<string | null>(null)

  const score = parseInt(scoreInput, 10)
  const scoreValid = Number.isInteger(score) && score >= 1 && score <= MAX_TARGET_SCORE

  async function handleSave() {
    if (!scoreValid) { setError(`Race length must be between 1 and ${MAX_TARGET_SCORE}.`); return }
    setSaving(true)
    setError(null)

    if (score !== targetScore) {
      const res = await updateMatchTargetScore(matchId, score)
      if (!res.success) { setError(res.error); setSaving(false); return }
    }
    if (player1IsGuest && p1.trim() && p1.trim() !== player1Name) {
      const res = await updateGuestName(player1Id, p1.trim())
      if (!res.success) { setError(res.error); setSaving(false); return }
    }
    if (player2IsGuest && p2.trim() && p2.trim() !== player2Name) {
      const res = await updateGuestName(player2Id, p2.trim())
      if (!res.success) { setError(res.error); setSaving(false); return }
    }

    setSaving(false)
    onSaved({
      targetScore: score,
      player1Name: player1IsGuest ? (p1.trim() || player1Name) : player1Name,
      player2Name: player2IsGuest ? (p2.trim() || player2Name) : player2Name,
    })
    onClose()
  }

  return (
    <Dialog open={open} onClose={onClose} title="Edit match">
      <div className="flex flex-col gap-5">
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

        {player1IsGuest && (
          <Input label="Player 1 name" value={p1} onChange={e => setP1(e.target.value)} maxLength={40} />
        )}
        {player2IsGuest && (
          <Input label="Player 2 name" value={p2} onChange={e => setP2(e.target.value)} maxLength={40} />
        )}

        {!player1IsGuest && !player2IsGuest && (
          <p className="text-xs text-ink-subtle">
            Only guest players can be renamed here — registered players manage their own name in Settings.
          </p>
        )}

        {error && (
          <p className="rounded-lg border border-loss/40 bg-loss/10 px-3 py-2 text-sm text-loss">
            {error}
          </p>
        )}
      </div>

      <DialogFooter>
        <Button variant="ghost" onClick={onClose} disabled={saving}>Cancel</Button>
        <Button onClick={handleSave} isLoading={saving} disabled={!scoreValid}>Save changes</Button>
      </DialogFooter>
    </Dialog>
  )
}
