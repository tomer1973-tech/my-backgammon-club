import * as React from 'react'
import { cn }     from '@/lib/utils'

// ── Card root ─────────────────────────────────────────────────────────────

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Adds a gold glow ring — use for highlighted / active cards */
  glow?: boolean
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, glow, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'rounded-xl border border-line bg-surface-raised',
        'transition-shadow duration-200',
        glow && 'ring-gold-glow',
        className,
      )}
      {...props}
    />
  ),
)
Card.displayName = 'Card'

// ── Card header ───────────────────────────────────────────────────────────

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex flex-col gap-1 px-5 pt-5 pb-4 border-b border-line', className)}
    {...props}
  />
))
CardHeader.displayName = 'CardHeader'

// ── Card title ────────────────────────────────────────────────────────────

const CardTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn('font-semibold text-base text-ink leading-tight', className)}
    {...props}
  />
))
CardTitle.displayName = 'CardTitle'

// ── Card description ──────────────────────────────────────────────────────

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn('text-sm text-ink-muted', className)}
    {...props}
  />
))
CardDescription.displayName = 'CardDescription'

// ── Card content ──────────────────────────────────────────────────────────

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('px-5 py-4', className)}
    {...props}
  />
))
CardContent.displayName = 'CardContent'

// ── Card footer ───────────────────────────────────────────────────────────

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'flex items-center gap-3 px-5 py-4 border-t border-line',
      className,
    )}
    {...props}
  />
))
CardFooter.displayName = 'CardFooter'

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter }
