import { SidebarNav } from './sidebar-nav'
import { MobileNav }  from './mobile-nav'
import { TopBar }     from './top-bar'
import type { SessionUser } from '@/types'

interface AppShellProps {
  user:     SessionUser
  children: React.ReactNode
}

/**
 * Responsive application shell.
 *
 * Desktop (≥ lg):  sidebar (240 px) + scrollable content area
 * Mobile  (< lg):  sticky top bar + scrollable content + fixed bottom nav
 */
export function AppShell({ user, children }: AppShellProps) {
  return (
    <div className="flex min-h-dvh bg-surface-base">
      {/* Desktop sidebar */}
      <SidebarNav user={user} />

      {/* Main column */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Mobile top bar */}
        <TopBar user={user} />

        {/* Page content */}
        <main
          className="flex-1 overflow-y-auto
            px-3 py-4 pb-20
            sm:px-4 sm:py-5
            lg:px-8 lg:py-6 lg:pb-8"
        >
          <div className="mx-auto max-w-3xl w-full lg:max-w-4xl">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile bottom nav */}
      <MobileNav userRole={user.role} />
    </div>
  )
}
