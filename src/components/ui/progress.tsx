import { cn } from '@/lib/utils'

interface ProgressProps {
  value:      number   // 0–100
  max?:       number
  className?: string
  variant?:   'gold' | 'win' | 'loss' | 'default'
  size?:      'sm' | 'md'
  animated?:  boolean
}

const variantClass = {
  gold:    'bg-gold',
  win:     'bg-win',
  loss:    'bg-loss',
  default: 'bg-ink-muted',
}

export function Progress({
  value,
  max = 100,
  className,
  variant = 'gold',
  size = 'md',
  animated = false,
}: ProgressProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100))

  return (
    <div
      className={cn(
        'w-full overflow-hidden rounded-full bg-surface-elevated',
        size === 'sm' ? 'h-1.5' : 'h-2',
        className,
      )}
      role="progressbar"
      aria-valuenow={value}
      aria-valuemax={max}
    >
      <div
        className={cn(
          'h-full rounded-full transition-all duration-500 ease-out',
          variantClass[variant],
          animated && 'animate-pulse',
        )}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}
