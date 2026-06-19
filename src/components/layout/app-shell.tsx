import { SidebarNav } from './sidebar-nav'
import { MobileNav }  from './mobile-nav'
import { TopBar }     from './top-bar'
import type { SessionUser } from '@/types'

interface AppShellProps {
  user:     SessionUser
  children: React.ReactNode
}

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
        <main className="flex-1 px-4 py-5 pb-24 sm:px-6 sm:py-6 lg:px-10 lg:py-8 lg:pb-10">
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
