'use client'

/**
 * SkinPicker — lets the player choose a complete visual direction (surfaces +
 * both accents + ink, not just one accent hue). When a skin is active it
 * overrides the Theme/Accent pickers below — pick "Custom" to go back to
 * those instead.
 */

import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSkin, type SkinChoice } from '@/hooks/use-skin'

const SKINS: { value: SkinChoice; label: string; base: string; accent: string }[] = [
  { value: 'none',           label: 'Custom',         base: '#1a1e27', accent: '#e08a35' },
  { value: 'club-noir',      label: 'Club Noir',       base: '#1a1e27', accent: '#e08a35' },
  { value: 'luxury-wood',    label: 'Luxury Wood',     base: '#f5f1ea', accent: '#8a5a2b' },
  { value: 'marquetry',      label: 'Marquetry',       base: '#241412', accent: '#c9a23a' },
  { value: 'royal-sapphire', label: 'Royal Sapphire',  base: '#13204a', accent: '#d4af56' },
  { value: 'emerald-modern', label: 'Emerald Modern',  base: '#16241c', accent: '#e0a849' },
  { value: 'midnight-jade',  label: 'Midnight Jade',   base: '#1c2528', accent: '#4cc3bc' },
  { value: 'champagne',      label: 'Champagne',       base: '#fbf4ea', accent: '#bb5a3f' },
]

export function SkinPicker() {
  const { skin, setSkin } = useSkin()

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {SKINS.map(s => {
        const active = skin === s.value
        return (
          <button
            key={s.value}
            onClick={() => setSkin(s.value)}
            className={cn(
              'flex flex-col items-center gap-2 rounded-xl border px-3 py-3 transition-all',
              active ? 'border-line-gold/60 bg-surface-elevated' : 'border-line bg-surface-raised hover:border-line-gold/30',
            )}
          >
            <span
              className="relative flex h-10 w-10 items-center justify-center rounded-full shadow-sm"
              style={{ background: s.value === 'none' ? `conic-gradient(${s.accent} 0 50%, ${s.base} 50% 100%)` : s.base }}
            >
              {s.value !== 'none' && (
                <span className="absolute bottom-0 right-0 h-4 w-4 rounded-full border-2 border-surface-raised" style={{ background: s.accent }} />
              )}
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
