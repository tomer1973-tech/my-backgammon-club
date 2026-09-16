'use client'

import Link              from 'next/link'
import { usePathname }   from 'next/navigation'
import {
  Trophy, BarChart2, Users, Settings, UserPlus2, CalendarClock,
  ShieldCheck, Zap, Medal, Dices, BookOpen, Bot, GraduationCap, Rss, Globe, MessageCircle,
  type LucideIcon,
} from 'lucide-react'
import { NAV_ITEMS }     from './nav-items'
import { Avatar }        from '@/components/ui/avatar'
import { Badge }         from '@/components/ui/badge'
import { ThemeToggle }   from '@/components/ui/theme-toggle'
import { useUnreadMessages } from '@/components/messages/unread-messages-provider'
import type { SessionUser } from '@/types'

const ICONS: Record<string, LucideIcon> = {
  Trophy, BarChart2, Users, Settings, UserPlus2, CalendarClock,
  ShieldCheck, Zap, Medal, Dices, BookOpen, Bot, GraduationCap, Rss, Globe, MessageCircle,
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
  { label: 'Account', hrefs: ['/messages', '/stats', '/schedule', '/settings', '/admin'] },
]

interface SidebarNavProps { user: SessionUser }

/**
 * The sidebar is a fixed "club room" — a warm, dark walnut-paneled rail
 * that stays the same regardless of whether the person has the app's
 * content area set to light or dark. Deliberately scoped, not read from
 * the shared surface, ink, or gold tokens: those follow the person's
 * theme choice, and this panel intentionally doesn't. Values match the
 * "Backgammon Club Desktop — Luxury v2" design handoff.
 */
export function SidebarNav({ user }: SidebarNavProps) {
  const pathname = usePathname()
  const unreadMessages = useUnreadMessages()

  const allItems = NAV_ITEMS.filter(i => !i.adminOnly || user.role === 'ADMIN')

  function isActive(item: (typeof NAV_ITEMS)[0]) {
    return item.matchExact ? pathname === item.href : pathname.startsWith(item.href)
  }

  function groupItems(hrefs: string[]) {
    return allItems.filter(i => hrefs.some(h => i.href === h || i.href.startsWith(h + '/')))
  }

  return (
    <aside className="hidden md:flex flex-col w-[220px] flex-shrink-0 h-dvh sticky top-0 overflow-hidden">
      <div className="flex flex-col h-full" style={{ background: '#2B241A', color: '#EDE4D2' }}>

        {/* Logo */}
        <div className="flex items-center gap-3 px-5 pt-6 pb-5">
          <div className="gloss flex h-9 w-9 items-center justify-center rounded-xl">
            <span className="text-lg leading-none">🎲</span>
          </div>
          <div>
            <p className="font-display font-bold text-[15px] leading-tight tracking-tight" style={{ color: '#F4EEE2' }}>
              Backgammon
            </p>
            <p className="text-[10px] tracking-widest uppercase font-bold" style={{ color: '#B9A272' }}>Club</p>
          </div>
        </div>

        {/* Divider */}
        <div className="mx-4 h-px mb-3" style={{ background: 'rgba(255,255,255,.08)' }} />

        {/* Nav groups */}
        <nav className="flex-1 px-3 space-y-5 overflow-y-auto no-scrollbar py-1">
          {NAV_GROUPS.map(group => {
            const items = groupItems(group.hrefs)
            if (items.length === 0) return null
            return (
              <div key={group.label}>
                <p className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: '#7C7259' }}>
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
                        className="group relative flex items-center gap-2.5 rounded-xl px-3 py-2 text-[13.5px] font-medium transition-all duration-150"
                        style={{
                          background: active ? 'rgba(210,184,137,.16)' : 'transparent',
                          color: active ? '#D2B889' : isZap ? '#D2B889cc' : '#BDB29B',
                        }}
                      >
                        {Icon && <Icon className="h-4 w-4 flex-shrink-0" style={{ color: active ? '#D2B889' : '#BDB29B' }} />}
                        <span className="truncate">{item.label}</span>
                        {isZap && !active && (
                          <span className="ml-auto text-[9px] font-bold uppercase tracking-wide rounded px-1.5 py-0.5" style={{ background: '#3E5D45', color: '#B7D9BC' }}>
                            Free
                          </span>
                        )}
                        {item.href === '/messages' && unreadMessages > 0 && (
                          <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-bold" style={{ background: '#D2B889', color: '#3A3226' }}>
                            {unreadMessages > 9 ? '9+' : unreadMessages}
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
        <div className="mx-4 h-px mt-2" style={{ background: 'rgba(255,255,255,.08)' }} />

        {/* Theme toggle — scoped to dark tokens so it stays legible on this
            fixed-dark panel regardless of the content area's own theme */}
        <div className="px-3 pb-2" data-theme="dark">
          <ThemeToggle />
        </div>

        {/* User card */}
        <div className="px-3 pb-4">
          <Link
            href="/settings"
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-150 group"
            style={{ borderTop: '1px solid rgba(255,255,255,.08)' }}
          >
            <Avatar name={user.name} src={user.avatarUrl} size="sm" className="flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-[12.5px] font-semibold truncate leading-tight" style={{ color: '#F4EEE2' }}>{user.name}</p>
              <p className="text-[10.5px] truncate mt-0.5" style={{ color: '#8A7F65' }}>{user.email}</p>
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
