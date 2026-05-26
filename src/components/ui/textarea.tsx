'use client'

import { forwardRef } from 'react'
import { cn }         from '@/lib/utils'

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  hint?:  string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, hint, className, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-ink-muted">
            {label}
          </label>
        )}

        <textarea
          ref={ref}
          id={inputId}
          className={cn(
            'w-full resize-none rounded-lg border border-line bg-surface-elevated px-3 py-2.5',
            'text-sm text-ink placeholder:text-ink-subtle',
            'transition-colors focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/20',
            error && 'border-loss focus:border-loss focus:ring-loss/20',
            className,
          )}
          rows={3}
          {...props}
        />

        {error && <p className="text-xs text-loss">{error}</p>}
        {hint && !error && <p className="text-xs text-ink-subtle">{hint}</p>}
      </div>
    )
  },
)
Textarea.displayName = 'Textarea'
