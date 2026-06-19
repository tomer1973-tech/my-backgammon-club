'use client'

import { useTransition }  from 'react'
import { usePathname }    from 'next/navigation'
import { LogOut }         from 'lucide-react'
import { logout }         from '@/actions/auth'
import { Avatar }         from '@/components/ui/avatar'
import { ThemeToggle }    from '@/components/ui/theme-toggle'
import { NAV_ITEMS }      from './nav-items'
import type { SessionUser } from '@/types'

interface TopBarProps { user: SessionUser }

export function TopBar({ user }: TopBarProps) {
  const [isPending, startTransition] = useTransition()
  const pathname = usePathname()

  const match = NAV_ITEMS
    .filter(i => i.matchExact ? pathname === i.href : pathname.startsWith(i.href))
    .sort((a, b) => b.href.length - a.href.length)[0]
  const pageTitle = match?.label ?? 'Club'

  const handleLogout = () => startTransition(async () => { await logout() })
  const firstName = user.name.split(' ')[0]

  return (
    <header className="md:hidden sticky top-0 z-30 flex items-center gap-3 px-4 h-16
      bg-surface-canvas/88 backdrop-blur-xl border-b border-white/5">

      {/* Copper top-line accent */}
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-gold/30 to-transparent" />

      {/* Left: logo + page title */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl flex-shrink-0
          bg-gradient-to-br from-gold to-gold-dim shadow-[0_2px_10px_hsl(var(--gold)/0.4)]">
          <span className="text-sm leading-none">🎲</span>
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-medium text-ink-subtle leading-none mb-0.5">My Backgammon Club</p>
          <p className="text-[15px] font-bold text-ink leading-none truncate">{pageTitle}</p>
        </div>
      </div>

      {/* Right: theme toggle + user pill + logout */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <ThemeToggle compact />
        <div className="flex items-center gap-2 rounded-full border border-white/8 bg-surface-raised/60 pl-2 pr-3 py-1.5">
          <Avatar name={user.name} src={user.avatarUrl} size="sm"
            className="ring-1 ring-gold/25 ring-offset-1 ring-offset-surface-canvas" />
          <span className="text-[13px] font-semibold text-ink hidden xs:block">{firstName}</span>
        </div>
        <button
          onClick={handleLogout}
          disabled={isPending}
          aria-label="Sign out"
          className="flex h-8 w-8 items-center justify-center rounded-full border border-white/8
            bg-surface-raised/60 text-ink-subtle hover:text-loss hover:border-loss/30 transition-all"
        >
          <LogOut className="h-3.5 w-3.5" />
        </button>
      </div>
    </header>
  )
}
