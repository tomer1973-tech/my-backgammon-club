'use client'

import { useState, useRef, useEffect } from 'react'
import { Smile } from 'lucide-react'
import { cn } from '@/lib/utils'

const EMOJI_GROUPS: { label: string; emojis: string[] }[] = [
  { label: 'Smileys', emojis: ['😀', '😂', '😅', '😉', '😎', '🤔', '😬', '😴', '🥳', '😮', '😭', '🙄'] },
  { label: 'Gestures', emojis: ['👍', '👎', '👏', '🙏', '🤝', '💪', '✌️', '🤞', '👌', '🙌'] },
  { label: 'Backgammon', emojis: ['🎲', '♟️', '🏆', '🔥', '⚡', '💯', '🎯', '🍀'] },
  { label: 'Hearts', emojis: ['❤️', '😍', '🥰', '😘', '💯', '🎉'] },
]

export function EmojiPicker({ onSelect, className }: { onSelect: (emoji: string) => void; className?: string }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [open])

  return (
    <div ref={ref} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-label="Add emoji"
        className={cn(
          'flex h-9 w-9 items-center justify-center rounded-full text-ink-subtle transition-colors hover:bg-surface-elevated hover:text-gold',
          open && 'bg-surface-elevated text-gold',
        )}
      >
        <Smile className="h-[18px] w-[18px]" />
      </button>

      {open && (
        <div className="absolute bottom-full right-0 z-20 mb-2 w-64 rounded-2xl border border-line bg-surface-elevated p-3 shadow-elevated">
          <div className="flex max-h-56 flex-col gap-2.5 overflow-y-auto pr-1">
            {EMOJI_GROUPS.map(group => (
              <div key={group.label}>
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-ink-subtle">{group.label}</p>
                <div className="grid grid-cols-6 gap-0.5">
                  {group.emojis.map(emoji => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => { onSelect(emoji); setOpen(false) }}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-lg transition-colors hover:bg-surface-subtle/40"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
