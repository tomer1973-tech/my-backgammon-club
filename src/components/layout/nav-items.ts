/**
 * Central nav item registry.
 * Both the sidebar (desktop) and bottom bar (mobile) read from this list.
 */

export interface NavItem {
  label:      string
  href:       string
  icon:       string   // lucide icon name
  matchExact?: boolean
  adminOnly?: boolean  // only shown to ADMIN role
}

export const NAV_ITEMS: NavItem[] = [
  { label: 'Tournaments', href: '/',            icon: 'Trophy',       matchExact: true },
  { label: 'Quick Game',  href: '/quick-game',  icon: 'Zap',          matchExact: true },
  { label: 'Schedule',    href: '/schedule',    icon: 'CalendarClock' },
  { label: 'My Stats',    href: '/stats',       icon: 'BarChart2' },
  { label: 'Players',     href: '/players',     icon: 'Users' },
  { label: 'Groups',      href: '/groups',      icon: 'UserPlus2' },
  { label: 'Settings',    href: '/settings',    icon: 'Settings' },
  { label: 'Admin',       href: '/admin',       icon: 'ShieldCheck',  adminOnly: true },
]
