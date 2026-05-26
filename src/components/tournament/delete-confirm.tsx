'use client'

import { useState }          from 'react'
import { AlertTriangle }     from 'lucide-react'
import { Dialog, DialogFooter } from '@/components/ui/dialog'
import { Button }            from '@/components/ui/button'
import { deleteTournament }  from '@/actions/tournament'

interface DeleteConfirmProps {
  open:           boolean
  tournamentName: string
  tournamentId:   string
  onClose:        () => void
  onDeleted:      () => void
}

export function DeleteConfirm({
  open,
  tournamentName,
  tournamentId,
  onClose,
  onDeleted,
}: DeleteConfirmProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  async function handleDelete() {
    setLoading(true)
    setError(null)
    const result = await deleteTournament({ tournamentId })
    setLoading(false)
    if (result.success) {
      onDeleted()
      onClose()
    } else {
      setError(result.error)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} size="sm">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-loss/15">
          <AlertTriangle className="h-6 w-6 text-loss" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-ink">Delete tournament?</h3>
          <p className="mt-1 text-sm text-ink-muted">
            <span className="font-medium text-ink">{tournamentName}</span> and all its data
            will be permanently hidden. This can&apos;t be undone.
          </p>
        </div>
        {error && (
          <p className="w-full rounded-lg border border-loss/40 bg-loss/10 px-3 py-2 text-sm text-loss">
            {error}
          </p>
        )}
      </div>
      <DialogFooter className="mt-4">
        <Button variant="ghost" onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button variant="destructive" onClick={handleDelete} isLoading={loading}>
          Delete
        </Button>
      </DialogFooter>
    </Dialog>
  )
}
