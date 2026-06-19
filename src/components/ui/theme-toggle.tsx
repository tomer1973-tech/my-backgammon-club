'use client'

import { Moon, Sun, SunMoon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTheme, type ThemeChoice } from '@/hooks/use-theme'

const OPTIONS: { value: ThemeChoice; icon: React.ElementType; label: string }[] = [
  { value: 'dark',  icon: Moon,    label: 'Dark'  },
  { value: 'auto',  icon: SunMoon, label: 'Auto'  },
  { value: 'light', icon: Sun,     label: 'Light' },
]

interface ThemeToggleProps {
  /** compact = icon-only pill in sidebar; default = full pill with labels */
  compact?: boolean
}

export function ThemeToggle({ compact = false }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme()

  return (
    <div className="flex items-center gap-0.5 rounded-lg border border-line bg-surface-canvas p-0.5">
      {OPTIONS.map(({ value, icon: Icon, label }) => {
        const active = theme === value
        return (
          <button
            key={value}
            onClick={() => setTheme(value)}
            title={label}
            aria-label={label}
            className={cn(
              'flex items-center gap-1.5 rounded-md px-2 py-1.5 text-[11px] font-semibold transition-all duration-150',
              active
                ? 'bg-gold/15 text-gold shadow-sm'
                : 'text-ink-subtle hover:text-ink-muted hover:bg-surface-raised/50',
              compact && 'px-1.5',
            )}
          >
            <Icon className="h-3.5 w-3.5 flex-shrink-0" />
            {!compact && <span>{label}</span>}
          </button>
        )
      })}
    </div>
  )
}
