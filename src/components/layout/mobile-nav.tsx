'use client'

import Link            from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Trophy, BarChart2, Users, Settings, UserPlus2, CalendarClock,
  ShieldCheck, Zap, Medal, Dices, Rss, Bot, GraduationCap, MessageCircle, type LucideIcon,
} from 'lucide-react'
import { cn }          from '@/lib/utils'
import { NAV_ITEMS }   from './nav-items'
import { useUnreadMessages } from '@/components/messages/unread-messages-provider'

const ICONS: Record<string, LucideIcon> = {
  Trophy, BarChart2, Users, Settings, UserPlus2, CalendarClock,
  ShieldCheck, Zap, Medal, Dices, Rss, Bot, GraduationCap, MessageCircle,
}

interface MobileNavProps { userRole?: string }

export function MobileNav({ userRole }: MobileNavProps) {
  const pathname = usePathname()
  const unreadMessages = useUnreadMessages()
  const visibleItems = NAV_ITEMS
    .filter(i => !i.adminOnly || userRole === 'ADMIN')
    .filter(i => !i.hideOnMobile)

  return (
    <nav className="md:hidden fixed inset-x-0 bottom-0 z-40
      bg-surface-canvas/92 backdrop-blur-xl border-t border-line/60
      pb-[env(safe-area-inset-bottom)]">

      {/* Copper top-line glow */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/20 to-transparent" />

      <div className="flex items-center justify-around px-1 pt-1.5 pb-1">
        {visibleItems.map(item => {
          const Icon = ICONS[item.icon]
          const active = item.matchExact
            ? pathname === item.href
            : pathname.startsWith(item.href)
          const isZap = item.href === '/quick-game'

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'relative flex flex-1 flex-col items-center gap-1 py-1.5 px-1 rounded-xl',
                'transition-all duration-150',
                active ? 'text-gold' : 'text-ink-subtle',
              )}
            >
              {/* Active pill background */}
              {active && (
                <span className="absolute inset-0 rounded-xl bg-gold/10" />
              )}

              {/* Quick Game gets copper ring */}
              {isZap && !active && (
                <span className="absolute inset-0 rounded-xl border border-gold/15" />
              )}

              {Icon && (
                <span className="relative">
                  <Icon className={cn(
                    'relative h-5 w-5 transition-all duration-150',
                    active && 'drop-shadow-[0_0_6px_hsl(var(--gold)/0.6)]',
                    isZap && !active && 'text-gold/60',
                  )} />
                  {item.href === '/messages' && unreadMessages > 0 && (
                    <span className="absolute -top-1 -right-1.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-gold px-0.5 text-[8px] font-bold text-surface-canvas">
                      {unreadMessages > 9 ? '9+' : unreadMessages}
                    </span>
                  )}
                </span>
              )}
              <span className={cn(
                'relative text-[10px] font-semibold leading-none',
                active ? 'text-gold' : isZap ? 'text-gold/60' : 'text-ink-subtle',
              )}>
                {item.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
