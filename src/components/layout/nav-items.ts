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

// Mobile bottom bar shows only items without hideOnMobile.
export const NAV_ITEMS: NavItem[] = [
  { label: 'Home',        href: '/',             icon: 'Trophy',        matchExact: true },
  { label: 'Quick Game',  href: '/quick-game',   icon: 'Zap',           matchExact: true },
  { label: 'Practice',    href: '/practice',     icon: 'Bot',           matchExact: true },
  { label: 'Lessons',     href: '/lessons',      icon: 'GraduationCap', matchExact: true },
  { label: 'Settings',    href: '/settings',     icon: 'Settings' },
  // Desktop sidebar only:
  { label: 'Play',        href: '/play',         icon: 'Dices',         matchExact: true, hideOnMobile: true },
  { label: 'Feed',        href: '/feed',          icon: 'Rss',           matchExact: true, hideOnMobile: true },
  { label: 'Leaderboard', href: '/leaderboard',  icon: 'Medal',                           hideOnMobile: true },
  { label: 'Schedule',    href: '/schedule',     icon: 'CalendarClock',                   hideOnMobile: true },
  { label: 'My Stats',    href: '/stats',        icon: 'BarChart2',                        hideOnMobile: true },
  { label: 'Rules',       href: '/rules',        icon: 'BookOpen',                        hideOnMobile: true },
  { label: 'Groups',      href: '/groups',       icon: 'UserPlus2',                       hideOnMobile: true },
  { label: 'Admin',       href: '/admin',        icon: 'ShieldCheck',   adminOnly: true,  hideOnMobile: true },
]
