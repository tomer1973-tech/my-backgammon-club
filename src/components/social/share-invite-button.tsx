'use client'

/**
 * ShareInviteButton — small popover with WhatsApp / copy-link / native share
 * options. Pass `url` + `text`; defaults to inviting a friend to the platform.
 */

import { useState, useRef, useEffect } from 'react'
import { Share2, Link2, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ShareInviteButtonProps {
  url?:       string
  text?:      string
  label?:     string
  className?: string
}

export function ShareInviteButton({
  url   = typeof window !== 'undefined' ? window.location.origin : '',
  text  = 'Join me on My Backgammon Club!',
  label = 'Invite',
  className,
}: ShareInviteButtonProps) {
  const [open, setOpen]       = useState(false)
  const [copied, setCopied]   = useState(false)
  const [canShare, setCanShare] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => { setCanShare(typeof navigator !== 'undefined' && !!navigator.share) }, [])

  useEffect(() => {
    if (!open) return
    function onOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [open])

  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`

  async function handleCopy() {
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  async function handleNativeShare() {
    if (navigator.share) {
      try { await navigator.share({ title: 'My Backgammon Club', text, url }) } catch { /* user cancelled */ }
    }
  }

  return (
    <div ref={ref} className={cn('relative', className)}>
      <Button size="sm" variant="secondary" onClick={() => setOpen(o => !o)}>
        <Share2 className="h-3.5 w-3.5" />
        {label}
      </Button>

      {open && (
        <div className="absolute right-0 top-full z-20 mt-2 w-52 rounded-xl border border-line bg-surface-elevated p-1.5 shadow-elevated">
          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-ink transition-colors hover:bg-surface-subtle/40"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 fill-[#25D366]" aria-hidden>
              <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.87 9.87 0 0 0 4.74 1.21h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2zm0 18.13h-.01a8.2 8.2 0 0 1-4.18-1.14l-.3-.18-3.12.82.83-3.04-.2-.31a8.22 8.22 0 0 1-1.26-4.37c0-4.54 3.7-8.24 8.25-8.24 2.2 0 4.27.86 5.83 2.42a8.18 8.18 0 0 1 2.41 5.83c0 4.54-3.7 8.21-8.25 8.21zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.12-.17.25-.64.81-.78.97-.14.17-.29.18-.53.06-.25-.12-1.05-.39-2-1.23-.74-.66-1.24-1.48-1.39-1.73-.14-.25-.02-.38.11-.5.12-.12.27-.31.41-.46.14-.16.18-.27.27-.45.09-.18.05-.33-.02-.46-.08-.12-.62-1.5-.86-2.05-.23-.55-.46-.47-.63-.48-.16-.01-.35-.01-.54-.01-.18 0-.48.07-.74.34-.25.27-.96.95-.96 2.31 0 1.36.99 2.67 1.13 2.86.14.18 1.9 2.9 4.6 3.95 2.7 1.05 2.7.7 3.19.65.49-.05 1.58-.65 1.8-1.27.23-.62.23-1.16.16-1.27-.07-.12-.25-.18-.5-.3z" />
            </svg>
            WhatsApp
          </a>
          <button
            onClick={handleCopy}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-ink transition-colors hover:bg-surface-subtle/40"
          >
            {copied ? <Check className="h-4 w-4 text-win" /> : <Link2 className="h-4 w-4 text-ink-subtle" />}
            {copied ? 'Link copied' : 'Copy link'}
          </button>
          {canShare && (
            <button
              onClick={() => { handleNativeShare(); setOpen(false) }}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-ink transition-colors hover:bg-surface-subtle/40"
            >
              <Share2 className="h-4 w-4 text-ink-subtle" />
              More options…
            </button>
          )}
        </div>
      )}
    </div>
  )
}
