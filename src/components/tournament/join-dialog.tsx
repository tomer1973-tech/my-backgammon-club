'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { Dialog, DialogFooter }        from '@/components/ui/dialog'
import { Button }                      from '@/components/ui/button'
import { Input }                       from '@/components/ui/input'
import { Hash }                        from 'lucide-react'
import { joinTournament }              from '@/actions/tournament'
import type { ActionResult }           from '@/types'

const INITIAL: ActionResult = { success: true, data: undefined }

function SubmitBtn() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" isLoading={pending}>
      Join
    </Button>
  )
}

interface JoinDialogProps {
  open:    boolean
  onClose: () => void
}

export function JoinDialog({ open, onClose }: JoinDialogProps) {
  const [state, formAction] = useFormState(joinTournament, INITIAL)

  return (
    <Dialog open={open} onClose={onClose} title="Join a tournament" size="sm">
      <form action={formAction} className="flex flex-col gap-4">
        <p className="text-sm text-ink-muted">
          Enter the 6-character code shared by the tournament organizer.
        </p>

        <Input
          name="code"
          label="Tournament code"
          placeholder="ABC123"
          maxLength={6}
          autoFocus
          autoComplete="off"
          className="uppercase tracking-widest"
          leading={<Hash className="h-4 w-4" />}
        />

        {state && !state.success && (
          <p className="rounded-lg border border-loss/40 bg-loss/10 px-3 py-2 text-sm text-loss">
            {state.error}
          </p>
        )}

        <DialogFooter className="-mx-6 -mb-6 mt-0">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <SubmitBtn />
        </DialogFooter>
      </form>
    </Dialog>
  )
}
