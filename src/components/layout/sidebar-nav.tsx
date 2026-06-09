'use client'

import Link              from 'next/link'
import { usePathname }   from 'next/navigation'
import {
  Trophy, BarChart2, Users, Settings, UserPlus2, CalendarClock, ShieldCheck, Zap, Medal, type LucideIcon,
} from 'lucide-react'
import { cn }            from '@/lib/utils'
import { NAV_ITEMS }     from './nav-items'
import { Avatar }        from '@/components/ui/avatar'
import { Badge }         from '@/components/ui/badge'
import type { SessionUser } from '@/types'

// Icon map — driven by the string names in nav-items.ts
const ICONS: Record<string, LucideIcon> = { Trophy, BarChart2, Users, Settings, UserPlus2, CalendarClock, ShieldCheck, Zap, Medal }

const ROLE_VARIANT = {
  ADMIN:               'admin',
  TOURNAMENT_MANAGER:  'manager',
  PLAYER:              'player',
} as const

interface SidebarNavProps {
  user: SessionUser
}

export function SidebarNav({ user }: SidebarNavProps) {
  const pathname = usePathname()

  return (
    <aside
      className="hidden lg:flex flex-col w-60 flex-shrink-0
        bg-surface-base border-r border-line h-dvh sticky top-0"
    >
      {/* Brand */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-line">
        <div className="text-2xl">🎲</div>
        <span className="font-display font-bold text-ink text-lg tracking-tight">
          Backgammon
        </span>
      </div>

      {/* Nav links */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {NAV_ITEMS.filter(item => !item.adminOnly || user.role === 'ADMIN').map(item => {
          const Icon     = ICONS[item.icon]
          const active   = item.matchExact
            ? pathname === item.href
            : pathname.startsWith(item.href)
          const isQuick  = item.href === '/quick-game'

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium',
                'transition-all duration-150',
                isQuick && !active
                  ? 'text-gold border border-gold/20 bg-gold/5 hover:bg-gold/10 hover:border-gold/40'
                  : active
                    ? 'bg-gold/10 text-gold border border-gold/20'
                    : 'text-ink-muted hover:text-ink hover:bg-surface-raised border border-transparent',
              )}
            >
              {Icon && (
                <Icon
                  className={cn(
                    'h-4 w-4 flex-shrink-0',
                    isQuick || active ? 'text-gold' : 'text-ink-subtle',
                  )}
                />
              )}
              {item.label}
              {isQuick && !active && (
                <span className="ml-auto rounded-full bg-gold/20 px-1.5 py-0.5 text-[10px] font-semibold text-gold">
                  Free
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* User footer */}
      <div className="border-t border-line px-4 py-4">
        <div className="flex items-center gap-3">
          <Avatar name={user.name} src={user.avatarUrl} size="sm"
            className="ring-1 ring-gold/30 ring-offset-1 ring-offset-surface-base border-none"
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-ink truncate">{user.name}</p>
            <Badge
              variant={ROLE_VARIANT[user.role]}
              className="mt-0.5"
            >
              {user.role.replace('_', ' ').toLowerCase()}
            </Badge>
          </div>
        </div>
      </div>
    </aside>
  )
}
