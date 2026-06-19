'use client'

import { useTransition }  from 'react'
import { usePathname }    from 'next/navigation'
import { LogOut }         from 'lucide-react'
import { logout }         from '@/actions/auth'
import { Avatar }         from '@/components/ui/avatar'
import { Button }         from '@/components/ui/button'
import { NAV_ITEMS }      from './nav-items'
import type { SessionUser } from '@/types'

interface TopBarProps { user: SessionUser }

export function TopBar({ user }: TopBarProps) {
  const [isPending, startTransition] = useTransition()
  const pathname = usePathname()

  // Resolve current page title from nav items
  const match = NAV_ITEMS
    .filter(i => i.matchExact ? pathname === i.href : pathname.startsWith(i.href))
    .sort((a, b) => b.href.length - a.href.length)[0]
  const pageTitle = match?.label ?? 'Backgammon Club'

  const handleLogout = () => startTransition(async () => { await logout() })

  return (
    <header className="lg:hidden sticky top-0 z-30 flex items-center gap-3 px-4 h-14
      bg-surface-canvas/85 backdrop-blur-xl border-b border-line/60">

      {/* Brand mark */}
      <div className="flex items-center gap-2.5 flex-1 min-w-0">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg
          bg-gradient-to-br from-gold to-gold-dim shadow-[0_1px_8px_hsl(var(--gold)/0.3)] flex-shrink-0">
          <span className="text-sm leading-none">🎲</span>
        </div>
        <span className="font-display font-bold text-ink text-[15px] tracking-tight truncate">
          {pageTitle}
        </span>
      </div>

      {/* Right: avatar + logout */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <Avatar name={user.name} src={user.avatarUrl} size="sm"
          className="ring-1 ring-gold/20 ring-offset-1 ring-offset-surface-canvas" />
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={handleLogout}
          isLoading={isPending}
          aria-label="Sign out"
          className="text-ink-subtle hover:text-ink"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  )
}
