'use client'

/**
 * Select — styled native <select> that matches the Input component's look.
 * Supports label, error, hint, and leading icon.
 */

import { forwardRef }  from 'react'
import { ChevronDown } from 'lucide-react'
import { cn }          from '@/lib/utils'

interface SelectOption {
  value: string | number
  label: string
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?:   string
  error?:   string
  hint?:    string
  options:  SelectOption[]
  placeholder?: string
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, hint, options, placeholder, className, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-ink-muted">
            {label}
          </label>
        )}

        <div className="relative">
          <select
            ref={ref}
            id={inputId}
            className={cn(
              'w-full appearance-none rounded-lg border border-line bg-surface-elevated px-3 py-2.5',
              'pr-9 text-sm text-ink placeholder:text-ink-subtle',
              'transition-colors focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/20',
              error && 'border-loss focus:border-loss focus:ring-loss/20',
              className,
            )}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map(o => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-subtle" />
        </div>

        {error && <p className="text-xs text-loss">{error}</p>}
        {hint && !error && <p className="text-xs text-ink-subtle">{hint}</p>}
      </div>
    )
  },
)
Select.displayName = 'Select'
