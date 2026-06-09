'use client'

/**
 * Dialog — accessible modal using a fixed-position div overlay.
 *
 * Uses a plain div overlay instead of the native <dialog> element, which
 * avoids the native showModal() inertness mechanism that can permanently block
 * background interaction if the element is unmounted while open.
 *
 * Usage:
 *   const [open, setOpen] = useState(false)
 *   <Dialog open={open} onClose={() => setOpen(false)} title="My Dialog">
 *     ...content...
 *   </Dialog>
 */

import { useEffect, useRef }  from 'react'
import { X }                  from 'lucide-react'
import { cn }                 from '@/lib/utils'

interface DialogProps {
  open:       boolean
  onClose:    () => void
  title?:     string
  children:   React.ReactNode
  className?: string
  size?:      'sm' | 'md' | 'lg'
}

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
}

export function Dialog({ open, onClose, title, children, className, size = 'md' }: DialogProps) {
  const panelRef = useRef<HTMLDivElement>(null)

  // Close on Escape key
  useEffect(() => {
    if (!open) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  // Move focus into the panel when opened
  useEffect(() => {
    if (open) panelRef.current?.focus()
  }, [open])

  if (!open) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'dialog-title' : undefined}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      {/* Backdrop — absolute so it doesn't escape the stacking context */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        ref={panelRef}
        tabIndex={-1}
        className={cn(
          'relative z-10 w-full rounded-xl border border-line bg-surface-raised p-0',
          'shadow-elevated flex flex-col max-h-[90vh] outline-none',
          sizeClasses[size],
          className,
        )}
      >
        {/* Header */}
        {title && (
          <div className="flex items-center justify-between border-b border-line px-6 py-4 flex-shrink-0">
            <h2 id="dialog-title" className="text-base font-semibold text-ink">{title}</h2>
            <button
              onClick={onClose}
              className="rounded-md p-1 text-ink-subtle transition-colors hover:bg-surface-elevated hover:text-ink"
              aria-label="Close dialog"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">{children}</div>
      </div>
    </div>
  )
}

export function DialogFooter({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('flex items-center justify-end gap-3 border-t border-line px-6 py-4', className)}>
      {children}
    </div>
  )
}
