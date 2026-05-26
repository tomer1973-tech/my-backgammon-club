/**
 * Central nav item registry.
 * Both the sidebar (desktop) and bottom bar (mobile) read from this list.
 */

export interface NavItem {
  label:    string
  href:     string
  icon:     string   // lucide icon name
  matchExact?: boolean
}

export const NAV_ITEMS: NavItem[] = [
  { label: 'Tournaments', href: '/',         icon: 'Trophy',       matchExact: true },
  { label: 'My Stats',    href: '/stats',    icon: 'BarChart2' },
  { label: 'Players',     href: '/players',  icon: 'Users' },
  { label: 'Settings',    href: '/settings', icon: 'Settings' },
]
