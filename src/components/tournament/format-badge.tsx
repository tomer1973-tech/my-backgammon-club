import { cn }                        from '@/lib/utils'
import { TOURNAMENT_FORMAT_LABEL }   from '@/types'
import type { TournamentFormat }     from '@/types'

const colorMap: Record<TournamentFormat, string> = {
  ROUND_ROBIN:        'bg-gold/10 text-gold border-gold/30',
  SINGLE_ELIMINATION: 'bg-ink/8 text-ink-muted border-line',
  DOUBLE_ELIMINATION: 'bg-ink/8 text-ink-muted border-line',
  SWISS:              'bg-gold/6 text-gold/80 border-gold/20',
}

interface FormatBadgeProps {
  format:     TournamentFormat
  className?: string
}

export function FormatBadge({ format, className }: FormatBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium',
        colorMap[format],
        className,
      )}
    >
      {TOURNAMENT_FORMAT_LABEL[format]}
    </span>
  )
}
