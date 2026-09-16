'use client'

/**
 * AccentPicker — lets the player choose the platform's primary accent color.
 * Swatches preview their own true hue regardless of the currently active
 * accent (unlike the rest of the UI, which reads --gold dynamically).
 */

import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAccent, type AccentChoice } from '@/hooks/use-accent'

// Hex values match the light theme's accent tones (the app's default) so
// what you tap is what you get — these intentionally don't read from
// --gold like the rest of the UI, since all four need to show at once.
const SWATCHES: { value: AccentChoice; label: string; hex: string }[] = [
  { value: 'copper',   label: 'Copper',   hex: '#a98a5e' },
  { value: 'jade',     label: 'Jade',     hex: '#1f6b4d' },
  { value: 'sapphire', label: 'Sapphire', hex: '#3065a6' },
  { value: 'crimson',  label: 'Crimson',  hex: '#b03b4a' },
]

export function AccentPicker() {
  const { accent, setAccent } = useAccent()

  return (
    <div className="flex flex-wrap gap-3">
      {SWATCHES.map(s => {
        const active = accent === s.value
        return (
          <button
            key={s.value}
            onClick={() => setAccent(s.value)}
            className={cn(
              'flex flex-col items-center gap-2 rounded-xl border px-4 py-3 transition-all',
              active ? 'border-line-gold/60 bg-surface-elevated' : 'border-line bg-surface-raised hover:border-line-gold/30',
            )}
          >
            <span
              className="relative flex h-9 w-9 items-center justify-center rounded-full shadow-sm"
              style={{ backgroundColor: s.hex }}
            >
              {active && <Check className="h-4 w-4 text-white drop-shadow" strokeWidth={3} />}
            </span>
            <span className={cn('text-xs font-medium', active ? 'text-ink' : 'text-ink-muted')}>
              {s.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}
