'use client'

/**
 * Dialog — accessible modal built with native <dialog> element.
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
  open:     boolean
  onClose:  () => void
  title?:   string
  children: React.ReactNode
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
}

export function Dialog({ open, onClose, title, children, className, size = 'md' }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open) {
      dialog.showModal()
    } else {
      dialog.close()
    }
  }, [open])

  // Close on backdrop click (click outside the inner content)
  function handleBackdrop(e: React.MouseEvent<HTMLDialogElement>) {
    if (e.target === ref.current) onClose()
  }

  return (
    <dialog
      ref={ref}
      onClick={handleBackdrop}
      onClose={onClose}
      className={cn(
        // Native dialog reset + overlay
        'fixed inset-0 m-auto w-full rounded-xl border border-line bg-surface-raised p-0',
        'shadow-elevated backdrop:bg-black/60 backdrop:backdrop-blur-sm',
        'open:flex open:flex-col',
        sizeClasses[size],
        className,
      )}
    >
      {/* Header */}
      {title && (
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <h2 className="text-base font-semibold text-ink">{title}</h2>
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
    </dialog>
  )
}

export function DialogFooter({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('flex items-center justify-end gap-3 border-t border-line px-6 py-4', className)}>
      {children}
    </div>
  )
}
