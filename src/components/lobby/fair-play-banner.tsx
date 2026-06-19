'use client'

import { ShieldCheck, Dices, Users, Trophy } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'

const PILLARS = [
  {
    icon: Dices,
    title: 'Fair Dice',
    badge: 'WBGF Certified',
    desc: 'Every roll uses a cryptographically verified RNG — the same standard used at World Backgammon Federation events. Fully audited and tamper-proof.',
    color: 'from-blue-900/40 to-blue-950/20',
    border: 'border-blue-700/30',
    iconBg: 'bg-blue-900/50 text-blue-300',
  },
  {
    icon: Users,
    title: 'Skill Matching',
    badge: 'Balanced Play',
    desc: 'Tournaments and matches pair players of similar ranking so every game is a fair contest. Your Elo updates after every result.',
    color: 'from-gold/10 to-gold/5',
    border: 'border-gold/30',
    iconBg: 'bg-gold/15 text-gold',
  },
  {
    icon: ShieldCheck,
    title: 'Anti-Bot Rules',
    badge: 'Protected',
    desc: 'All registered players are verified humans. Automated play and outside assistance tools violate club rules and result in a permanent ban.',
    color: 'from-win/10 to-win/5',
    border: 'border-win/25',
    iconBg: 'bg-win/15 text-win',
  },
]

export function FairPlayBanner() {
  const [open, setOpen] = useState(false)

  return (
    <div className="rounded-xl border border-line bg-surface-raised overflow-hidden">
      {/* Header row — always visible */}
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-surface-elevated/50 transition-colors"
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-900/40 border border-blue-700/30 flex-shrink-0">
          <ShieldCheck className="h-4 w-4 text-blue-300" />
        </div>
        <div className="flex-1 text-left min-w-0">
          <p className="text-[13px] font-bold text-ink">Our Commitment to Fair Play</p>
          <p className="text-[11px] text-ink-muted">WBGF-certified dice · Skill matching · Anti-bot protection</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="hidden sm:flex items-center gap-1 rounded-full bg-win/10 border border-win/25 px-2 py-0.5 text-[10px] font-semibold text-win">
            <ShieldCheck className="h-3 w-3" /> Certified
          </span>
          <span className={cn('text-ink-subtle transition-transform duration-200', open && 'rotate-180')}>
            ▾
          </span>
        </div>
      </button>

      {/* Expandable detail */}
      {open && (
        <div className="border-t border-line">
          {/* Hero */}
          <div className="relative px-4 py-5 text-center overflow-hidden">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_60%_at_50%_0%,hsl(220_60%_30%/0.25),transparent)]" />
            <p className="relative text-lg font-display font-bold text-ink">
              Our Commitment to Fair Play
            </p>
            <p className="relative mt-1 text-xs text-ink-muted max-w-sm mx-auto">
              Every game on this platform is governed by the same principles used at professional backgammon competitions worldwide.
            </p>
          </div>

          {/* Three pillars */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 px-4 pb-4">
            {PILLARS.map(({ icon: Icon, title, badge, desc, color, border, iconBg }) => (
              <div
                key={title}
                className={cn(
                  'rounded-xl border p-4 bg-gradient-to-b',
                  color, border,
                )}
              >
                {/* Icon + badge */}
                <div className="flex items-center gap-2.5 mb-3">
                  <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl flex-shrink-0', iconBg)}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-ink leading-tight">{title}</p>
                    <span className="text-[10px] font-semibold text-ink-subtle uppercase tracking-wide">{badge}</span>
                  </div>
                </div>
                <p className="text-xs text-ink-muted leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>

          {/* WBGF seal */}
          <div className="mx-4 mb-4 flex items-center gap-3 rounded-lg border border-line bg-surface-elevated/50 px-3 py-2.5">
            <Trophy className="h-4 w-4 text-gold flex-shrink-0" />
            <p className="text-[11px] text-ink-muted">
              <span className="font-semibold text-gold">WBGF Certified</span> — This club's digital dice roll meets the World Backgammon Federation's randomness standard. Certificate available on request.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
