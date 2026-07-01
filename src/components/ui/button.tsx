import * as React                                 from 'react'
import { Slot }                                  from '@radix-ui/react-slot'
import { cva, type VariantProps }                from 'class-variance-authority'
import { cn }                                    from '@/lib/utils'

const buttonVariants = cva(
  // Base — shared by every variant
  [
    'inline-flex items-center justify-center gap-2',
    'font-medium text-sm leading-none',
    'rounded-lg border',
    'transition-all duration-150 ease-out',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-base',
    'disabled:pointer-events-none disabled:opacity-40',
    'select-none',
  ],
  {
    variants: {
      variant: {
        // Gold fill — primary action, gentle gradient + lifted glow for depth
        default: [
          'bg-gradient-to-b from-gold-bright to-gold border-gold-dim/60 text-surface-canvas',
          'shadow-[inset_0_1px_0_0_rgb(255_255_255_/_0.25),0_2px_10px_-2px_hsl(var(--gold)/0.5)]',
          'hover:to-gold-bright hover:shadow-[inset_0_1px_0_0_rgb(255_255_255_/_0.3),0_4px_16px_-2px_hsl(var(--gold)/0.65)]',
          'active:scale-[0.98]',
        ],
        // Dark with gold border — secondary action
        secondary: [
          'bg-surface-raised border-line-gold text-ink',
          'hover:bg-surface-elevated hover:border-gold/60',
          'active:scale-[0.98]',
        ],
        // Transparent — tertiary / navigation
        ghost: [
          'bg-transparent border-transparent text-ink-muted',
          'hover:bg-surface-raised hover:text-ink',
          'active:scale-[0.98]',
        ],
        // Danger — destructive actions
        destructive: [
          'bg-loss/20 border-loss/40 text-loss',
          'hover:bg-loss/30 hover:border-loss/60',
          'active:scale-[0.98]',
        ],
        // Gold text link style
        link: [
          'bg-transparent border-transparent text-gold underline-offset-4',
          'hover:underline hover:text-gold-bright',
          'h-auto p-0',
        ],
      },
      size: {
        sm:   'h-8  px-3    text-xs  rounded',
        default: 'h-10 px-4.5  text-sm',
        lg:   'h-12 px-6    text-base rounded-xl',
        icon: 'h-10 w-10   p-0',
        'icon-sm': 'h-8 w-8 p-0 rounded',
      },
    },
    defaultVariants: {
      variant: 'default',
      size:    'default',
    },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  isLoading?: boolean
  asChild?:   boolean   // Renders as the child element (e.g. <Link>), forwarding all classes
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, isLoading, disabled, asChild = false, children, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    // When asChild=true, Radix Slot uses React.Children.only() which requires
    // exactly one child. We must not pass any sibling expressions (even `false`)
    // alongside children, so we branch here instead of using inline conditionals.
    const inner = asChild ? children : (
      <>
        {isLoading && (
          <svg
            className="h-4 w-4 animate-spin"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden
          >
            <circle
              className="opacity-25"
              cx="12" cy="12" r="10"
              stroke="currentColor" strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        )}
        {children}
      </>
    )

    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        disabled={!asChild && (disabled || isLoading)}
        {...props}
      >
        {inner}
      </Comp>
    )
  },
)
Button.displayName = 'Button'

export { Button, buttonVariants }
