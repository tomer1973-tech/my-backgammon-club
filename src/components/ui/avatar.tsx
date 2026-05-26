import * as React from 'react'
import { cn }     from '@/lib/utils'

interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  name:      string
  src?:      string | null
  size?:     'sm' | 'md' | 'lg'
}

const sizeMap = {
  sm: 'h-7 w-7 text-[11px]',
  md: 'h-9 w-9 text-xs',
  lg: 'h-12 w-12 text-sm',
}

/**
 * Shows a photo if src is provided; falls back to initials generated
 * from the name. The background colour is deterministically derived
 * from the name so the same person always gets the same colour.
 */
function Avatar({ name, src, size = 'md', className, ...props }: AvatarProps) {
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase()

  // Simple deterministic hue from name (backgammon-themed — stays in warm gold range)
  const hue = (name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % 60) + 20

  return (
    <div
      className={cn(
        'relative inline-flex flex-shrink-0 items-center justify-center',
        'rounded-full border border-line font-semibold text-surface-canvas',
        'select-none overflow-hidden',
        sizeMap[size],
        className,
      )}
      style={!src ? { backgroundColor: `hsl(${hue}, 55%, 45%)` } : undefined}
      aria-label={name}
      {...props}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={name} className="h-full w-full object-cover" />
      ) : (
        <span>{initials}</span>
      )}
    </div>
  )
}

export { Avatar }
