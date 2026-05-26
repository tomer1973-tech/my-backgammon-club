'use client'

import React from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ErrorBoundaryState {
  hasError: boolean
  error:    Error | null
}

interface ErrorBoundaryProps {
  children:  React.ReactNode
  fallback?: React.ReactNode
  label?:    string   // e.g. "analytics" — shown in the error message
}

/**
 * Generic React error boundary.
 *
 * Wraps any subtree to prevent a client rendering crash from taking down
 * the entire page. Renders a friendly recovery UI with a retry button.
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // In production you could forward this to an error-tracking service.
    console.error('[ErrorBoundary]', error, info)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback

      return (
        <div className="flex flex-col items-center gap-4 rounded-xl border border-line bg-surface-raised py-12 text-center">
          <AlertTriangle className="h-10 w-10 text-gold/50" />
          <div>
            <p className="text-sm font-semibold text-ink">
              {this.props.label ? `Could not load ${this.props.label}` : 'Something went wrong'}
            </p>
            <p className="mt-1 text-xs text-ink-muted">
              {this.state.error?.message ?? 'An unexpected error occurred.'}
            </p>
          </div>
          <Button size="sm" variant="ghost" onClick={this.handleReset} className="gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" />
            Try again
          </Button>
        </div>
      )
    }

    return this.props.children
  }
}

/**
 * Convenience wrapper — use for sections that may fail independently
 * (analytics, charts, etc.) without crashing the surrounding page.
 */
export function SafeSection({
  children,
  label,
}: {
  children: React.ReactNode
  label?:   string
}) {
  return <ErrorBoundary label={label}>{children}</ErrorBoundary>
}
