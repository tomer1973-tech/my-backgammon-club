'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { MessageCircle, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogFooter } from '@/components/ui/dialog'
import { sendMessage } from '@/actions/messages'

interface MessageButtonProps {
  targetPlayerId: string
  targetName:     string
  className?:     string
}

export function MessageButton({ targetPlayerId, targetName, className }: MessageButtonProps) {
  const [open, setOpen]   = useState(false)
  const [body, setBody]   = useState('')
  const [sent, setSent]   = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function close() {
    setOpen(false)
    setBody('')
    setSent(false)
    setError(null)
  }

  function handleSend() {
    setError(null)
    startTransition(async () => {
      const res = await sendMessage(targetPlayerId, body)
      if (res.success) setSent(true)
      else setError(res.error)
    })
  }

  return (
    <>
      <Button size="sm" variant="secondary" onClick={() => setOpen(true)} className={className}>
        <MessageCircle className="h-3.5 w-3.5" />
        Message
      </Button>

      <Dialog open={open} onClose={close} title={`Message ${targetName}`} size="sm">
        {sent ? (
          <div className="flex flex-col items-center gap-2 py-4 text-center">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-win/15 text-win">
              <Check className="h-5 w-5" />
            </span>
            <p className="text-sm text-ink">Message sent to {targetName}.</p>
            <Link href={`/messages/${targetPlayerId}`} className="text-xs text-gold hover:underline">
              View conversation
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <textarea
              autoFocus
              value={body}
              onChange={e => setBody(e.target.value)}
              placeholder={`Say something to ${targetName}…`}
              rows={4}
              maxLength={1000}
              className="w-full resize-none rounded-lg border border-line bg-surface-elevated px-3 py-2 text-sm text-ink placeholder:text-ink-subtle focus:outline-none focus:border-gold/50 focus:ring-1 focus:ring-gold/20"
            />
            {error && <p className="text-xs text-loss">{error}</p>}
          </div>
        )}

        <DialogFooter>
          {sent ? (
            <Button onClick={close}>Done</Button>
          ) : (
            <>
              <Button variant="secondary" onClick={close} disabled={pending}>Cancel</Button>
              <Button onClick={handleSend} disabled={pending || !body.trim()}>Send</Button>
            </>
          )}
        </DialogFooter>
      </Dialog>
    </>
  )
}
