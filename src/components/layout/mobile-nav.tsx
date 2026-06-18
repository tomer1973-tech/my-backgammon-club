'use client'

import Link            from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Trophy, BarChart2, Users, Settings, UserPlus2, CalendarClock, ShieldCheck, Zap, Medal, Dices, Rss, type LucideIcon,
} from 'lucide-react'
import { cn }          from '@/lib/utils'
import { NAV_ITEMS }   from './nav-items'

const ICONS: Record<string, LucideIcon> = { Trophy, BarChart2, Users, Settings, UserPlus2, CalendarClock, ShieldCheck, Zap, Medal, Dices, Rss }

// Mobile nav needs role — we pass it via a wrapper that reads from layout
interface MobileNavProps { userRole?: string }

export function MobileNav({ userRole }: MobileNavProps) {
  const pathname = usePathname()
  const visibleItems = NAV_ITEMS
    .filter(item => !item.adminOnly || userRole === 'ADMIN')
    .filter(item => !item.hideOnMobile)

  return (
    <nav
      className="lg:hidden fixed inset-x-0 bottom-0 z-40
        bg-surface-base/90 backdrop-blur-md border-t border-line
        pb-[env(safe-area-inset-bottom)]"
    >
      <div className="flex items-center justify-around px-2 py-2">
        {visibleItems.map(item => {
          const Icon = ICONS[item.icon]
          const active = item.matchExact
            ? pathname === item.href
            : pathname.startsWith(item.href)

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-1 flex-col items-center gap-1 py-1.5 px-2 rounded-lg',
                'transition-colors duration-150',
                active ? 'text-gold' : 'text-ink-subtle hover:text-ink-muted',
              )}
            >
              {Icon && (
                <Icon className={cn('h-5 w-5', active && 'drop-shadow-[0_0_4px_hsl(var(--gold)/0.5)]')} />
              )}
              <span className="text-[10px] font-medium leading-none">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
