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
  hideOnMobile?: boolean // omit from the mobile bottom bar (still in the desktop sidebar)
}

export const NAV_ITEMS: NavItem[] = [
  { label: 'Tournaments', href: '/',             icon: 'Trophy',       matchExact: true },
  { label: 'Quick Game',  href: '/quick-game',   icon: 'Zap',          matchExact: true },
  { label: 'Play',        href: '/play',         icon: 'Dices',        matchExact: true },
  { label: 'Practice',    href: '/practice',     icon: 'Bot',          matchExact: true, hideOnMobile: true },
  { label: 'Lessons',     href: '/lessons',      icon: 'GraduationCap', matchExact: true, hideOnMobile: true },
  { label: 'Leaderboard', href: '/leaderboard',  icon: 'Medal' },
  { label: 'Schedule',    href: '/schedule',     icon: 'CalendarClock' },
  { label: 'My Stats',    href: '/stats',        icon: 'BarChart2' },
  { label: 'Rules',       href: '/rules',        icon: 'BookOpen',     hideOnMobile: true },
  { label: 'Players',     href: '/players',      icon: 'Users' },
  { label: 'Groups',      href: '/groups',       icon: 'UserPlus2' },
  { label: 'Settings',    href: '/settings',     icon: 'Settings' },
  { label: 'Admin',       href: '/admin',        icon: 'ShieldCheck',  adminOnly: true },
]
