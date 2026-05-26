import { cn }                        from '@/lib/utils'
import { TOURNAMENT_STATUS_LABEL }   from '@/types'
import type { TournamentStatus }     from '@/types'

const colorMap: Record<TournamentStatus, string> = {
  DRAFT:     'bg-ink/8 text-ink-subtle border-line',
  ACTIVE:    'bg-win/15 text-win border-win/30',
  COMPLETED: 'bg-gold/10 text-gold border-gold/30',
  ARCHIVED:  'bg-ink/5 text-ink-subtle border-line/50',
}

const dotMap: Record<TournamentStatus, string> = {
  DRAFT:     'bg-ink-subtle',
  ACTIVE:    'bg-win animate-pulse',
  COMPLETED: 'bg-gold',
  ARCHIVED:  'bg-ink-subtle/50',
}

interface StatusBadgeProps {
  status:     TournamentStatus
  className?: string
  showDot?:   boolean
}

export function StatusBadge({ status, className, showDot = true }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium',
        colorMap[status],
        className,
      )}
    >
      {showDot && <span className={cn('h-1.5 w-1.5 rounded-full', dotMap[status])} />}
      {TOURNAMENT_STATUS_LABEL[status]}
    </span>
  )
}
