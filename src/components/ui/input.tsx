import * as React from 'react'
import { cn }     from '@/lib/utils'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?:   string
  error?:   string
  hint?:    string
  leading?: React.ReactNode  // icon or adornment before the input
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, leading, id, ...props }, ref) => {
    const inputId = id ?? React.useId()

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-xs font-medium text-ink-muted uppercase tracking-wide"
          >
            {label}
          </label>
        )}

        <div className="relative">
          {leading && (
            <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-ink-subtle">
              {leading}
            </div>
          )}

          <input
            id={inputId}
            ref={ref}
            className={cn(
              // Base
              'w-full rounded-lg border bg-surface-elevated text-ink text-sm',
              'px-3.5 py-2.5 h-11',
              'placeholder:text-ink-subtle',
              // Border states
              'border-line',
              'hover:border-line-gold/60',
              'focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/25',
              // Error state
              error && 'border-loss/60 focus:border-loss focus:ring-loss/25',
              // Transition
              'transition-colors duration-150',
              // Leading icon offset
              leading && 'pl-9',
              className,
            )}
            aria-invalid={!!error}
            aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
            {...props}
          />
        </div>

        {error && (
          <p id={`${inputId}-error`} className="text-xs text-loss font-medium">
            {error}
          </p>
        )}
        {hint && !error && (
          <p id={`${inputId}-hint`} className="text-xs text-ink-subtle">
            {hint}
          </p>
        )}
      </div>
    )
  },
)
Input.displayName = 'Input'

export { Input }
