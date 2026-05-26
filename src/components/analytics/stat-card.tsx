import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

interface StatCardProps {
  label:    string
  value:    string | number
  subtext?: string
  trend?:   'up' | 'down' | 'neutral'
  trendLabel?: string
  icon?:    ReactNode
  accent?:  'default' | 'gold' | 'win' | 'loss'
  className?: string
}

const ACCENT_STYLES = {
  default: 'text-ink',
  gold:    'text-gold',
  win:     'text-win',
  loss:    'text-loss',
} as const

const TREND_ICON: Record<NonNullable<StatCardProps['trend']>, string> = {
  up:      '↑',
  down:    '↓',
  neutral: '→',
}

const TREND_COLOR: Record<NonNullable<StatCardProps['trend']>, string> = {
  up:      'text-win',
  down:    'text-loss',
  neutral: 'text-ink-muted',
}

export function StatCard({
  label,
  value,
  subtext,
  trend,
  trendLabel,
  icon,
  accent = 'default',
  className,
}: StatCardProps) {
  return (
    <div
      className={cn(
        'rounded-xl border border-line bg-surface-raised p-4',
        className,
      )}
    >
      <div className="flex items-start justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-ink-subtle">{label}</p>
        {icon && <span className="text-ink-muted">{icon}</span>}
      </div>

      <p className={cn('mt-2 text-3xl font-black tabular-nums', ACCENT_STYLES[accent])}>
        {value}
      </p>

      {(subtext || trend) && (
        <div className="mt-1.5 flex items-center gap-1.5">
          {trend && (
            <span className={cn('text-xs font-semibold', TREND_COLOR[trend])}>
              {TREND_ICON[trend]}
              {trendLabel && ` ${trendLabel}`}
            </span>
          )}
          {subtext && (
            <span className="text-xs text-ink-muted">{subtext}</span>
          )}
        </div>
      )}
    </div>
  )
}
