'use client'

import Link              from 'next/link'
import { usePathname }   from 'next/navigation'
import {
  Trophy, BarChart2, Users, Settings, UserPlus2, CalendarClock,
  ShieldCheck, Zap, Medal, Dices, BookOpen, Bot, GraduationCap, Rss,
  type LucideIcon,
} from 'lucide-react'
import { cn }            from '@/lib/utils'
import { NAV_ITEMS }     from './nav-items'
import { Avatar }        from '@/components/ui/avatar'
import { Badge }         from '@/components/ui/badge'
import type { SessionUser } from '@/types'

const ICONS: Record<string, LucideIcon> = {
  Trophy, BarChart2, Users, Settings, UserPlus2, CalendarClock,
  ShieldCheck, Zap, Medal, Dices, BookOpen, Bot, GraduationCap, Rss,
}

const ROLE_VARIANT = {
  ADMIN:               'admin',
  TOURNAMENT_MANAGER:  'manager',
  PLAYER:              'player',
} as const

// Visual groupings for the sidebar
const NAV_GROUPS = [
  { label: 'Play',    hrefs: ['/', '/quick-game', '/play', '/practice', '/lessons'] },
  { label: 'Club',    hrefs: ['/feed', '/players', '/groups', '/leaderboard', '/tournaments'] },
  { label: 'Account', hrefs: ['/stats', '/schedule', '/settings', '/admin'] },
]

interface SidebarNavProps { user: SessionUser }

export function SidebarNav({ user }: SidebarNavProps) {
  const pathname = usePathname()

  const allItems = NAV_ITEMS.filter(i => !i.adminOnly || user.role === 'ADMIN')

  function isActive(item: (typeof NAV_ITEMS)[0]) {
    return item.matchExact ? pathname === item.href : pathname.startsWith(item.href)
  }

  function groupItems(hrefs: string[]) {
    return allItems.filter(i => hrefs.some(h => i.href === h || i.href.startsWith(h + '/')))
  }

  return (
    <aside className="hidden lg:flex flex-col w-[220px] flex-shrink-0 h-dvh sticky top-0 overflow-hidden">
      {/* Walnut-gradient left panel */}
      <div className="flex flex-col h-full bg-surface-canvas border-r border-line/60">

        {/* Logo */}
        <div className="flex items-center gap-3 px-5 pt-6 pb-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl
            bg-gradient-to-br from-gold to-gold-dim shadow-[0_2px_12px_hsl(var(--gold)/0.35)]">
            <span className="text-lg leading-none">🎲</span>
          </div>
          <div>
            <p className="font-display font-bold text-ink text-[15px] leading-tight tracking-tight">
              Backgammon
            </p>
            <p className="text-[10px] text-ink-subtle tracking-widest uppercase">Club</p>
          </div>
        </div>

        {/* Divider */}
        <div className="mx-4 h-px bg-gradient-to-r from-transparent via-line to-transparent mb-3" />

        {/* Nav groups */}
        <nav className="flex-1 px-3 space-y-5 overflow-y-auto no-scrollbar py-1">
          {NAV_GROUPS.map(group => {
            const items = groupItems(group.hrefs)
            if (items.length === 0) return null
            return (
              <div key={group.label}>
                <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-subtle/70">
                  {group.label}
                </p>
                <div className="space-y-0.5">
                  {items.map(item => {
                    const Icon   = ICONS[item.icon]
                    const active = isActive(item)
                    const isZap  = item.href === '/quick-game'
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                          'group relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium',
                          'transition-all duration-150',
                          active
                            ? 'bg-gold/12 text-gold'
                            : isZap
                            ? 'text-gold/80 hover:text-gold hover:bg-gold/8'
                            : 'text-ink-muted hover:text-ink hover:bg-surface-raised/60',
                        )}
                      >
                        {/* Left accent bar */}
                        {active && (
                          <span className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-0.5 rounded-full bg-gold" />
                        )}
                        {Icon && (
                          <Icon className={cn(
                            'h-4 w-4 flex-shrink-0 transition-colors',
                            active ? 'text-gold' : isZap ? 'text-gold/70' : 'text-ink-subtle group-hover:text-ink-muted',
                          )} />
                        )}
                        <span className="truncate">{item.label}</span>
                        {isZap && !active && (
                          <span className="ml-auto text-[9px] font-bold uppercase tracking-wide text-gold/60 border border-gold/20 rounded px-1 py-0.5">
                            Free
                          </span>
                        )}
                      </Link>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </nav>

        {/* Divider */}
        <div className="mx-4 h-px bg-gradient-to-r from-transparent via-line to-transparent mt-2" />

        {/* User card */}
        <div className="px-3 py-4">
          <Link
            href="/settings"
            className="flex items-center gap-3 rounded-xl border border-line/50 bg-surface-raised/40 px-3 py-2.5
              hover:border-gold/20 hover:bg-surface-raised/70 transition-all duration-150 group"
          >
            <Avatar
              name={user.name}
              src={user.avatarUrl}
              size="sm"
              className="ring-1 ring-gold/20 ring-offset-1 ring-offset-surface-canvas flex-shrink-0"
            />
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold text-ink truncate leading-tight">{user.name}</p>
              <p className="text-[10px] text-ink-subtle truncate mt-0.5">{user.email}</p>
            </div>
            <Badge variant={ROLE_VARIANT[user.role]} className="flex-shrink-0 text-[9px]">
              {user.role === 'TOURNAMENT_MANAGER' ? 'mgr' : user.role.toLowerCase()}
            </Badge>
          </Link>
        </div>

      </div>
    </aside>
  )
}
