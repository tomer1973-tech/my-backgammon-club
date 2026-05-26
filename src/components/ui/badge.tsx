import * as React                      from 'react'
import { cva, type VariantProps }     from 'class-variance-authority'
import { cn }                         from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold leading-none uppercase tracking-wide border transition-colors duration-150',
  {
    variants: {
      variant: {
        default:    'bg-surface-elevated border-line text-ink-muted',
        gold:       'bg-gold/10 border-gold/30 text-gold',
        win:        'bg-win/10 border-win/30 text-win',
        loss:       'bg-loss/10 border-loss/30 text-loss',
        warning:    'bg-warning/10 border-warning/30 text-[hsl(var(--warning))]',
        admin:      'bg-gold/15 border-gold/40 text-gold-bright',
        manager:    'bg-surface-elevated border-line-gold/50 text-ink',
        player:     'bg-surface-elevated border-line text-ink-muted',
        guest:      'bg-surface-muted border-line text-ink-subtle',
      },
    },
    defaultVariants: { variant: 'default' },
  },
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
