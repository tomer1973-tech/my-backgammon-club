'use client'

/**
 * Tabs — simple client-side tab bar.
 * Usage:
 *   <Tabs value={tab} onValueChange={setTab}>
 *     <TabsList>
 *       <TabsTrigger value="overview">Overview</TabsTrigger>
 *       <TabsTrigger value="players">Players</TabsTrigger>
 *     </TabsList>
 *     <TabsContent value="overview">...</TabsContent>
 *     <TabsContent value="players">...</TabsContent>
 *   </Tabs>
 */

import { createContext, useContext } from 'react'
import { cn }                        from '@/lib/utils'

// ── Context ──────────────────────────────────────────────────────────────────

interface TabsCtx {
  value:         string
  onValueChange: (v: string) => void
}

const Ctx = createContext<TabsCtx>({ value: '', onValueChange: () => {} })

// ── Root ─────────────────────────────────────────────────────────────────────

interface TabsProps {
  value:         string
  onValueChange: (v: string) => void
  children:      React.ReactNode
  className?:    string
}

export function Tabs({ value, onValueChange, children, className }: TabsProps) {
  return (
    <Ctx.Provider value={{ value, onValueChange }}>
      <div className={cn('w-full', className)}>{children}</div>
    </Ctx.Provider>
  )
}

// ── List (button bar) ─────────────────────────────────────────────────────────

export function TabsList({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      role="tablist"
      className={cn(
        'flex gap-1 rounded-xl border border-line bg-surface-base p-1',
        className,
      )}
    >
      {children}
    </div>
  )
}

// ── Trigger ───────────────────────────────────────────────────────────────────

interface TabsTriggerProps {
  value:     string
  children:  React.ReactNode
  className?: string
}

export function TabsTrigger({ value, children, className }: TabsTriggerProps) {
  const ctx = useContext(Ctx)
  const isActive = ctx.value === value

  return (
    <button
      role="tab"
      aria-selected={isActive}
      onClick={() => ctx.onValueChange(value)}
      className={cn(
        'flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-all',
        isActive
          ? 'bg-surface-raised text-gold shadow-sm'
          : 'text-ink-subtle hover:text-ink-muted',
        className,
      )}
    >
      {children}
    </button>
  )
}

// ── Content ───────────────────────────────────────────────────────────────────

interface TabsContentProps {
  value:     string
  children:  React.ReactNode
  className?: string
}

export function TabsContent({ value, children, className }: TabsContentProps) {
  const ctx = useContext(Ctx)
  if (ctx.value !== value) return null
  return <div role="tabpanel" className={cn('mt-4', className)}>{children}</div>
}
