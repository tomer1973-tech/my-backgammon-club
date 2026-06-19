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
      {/* Sidebar — visible from md (768px) up */}
      <SidebarNav user={user} />

      {/* Main column */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Top bar — mobile only (below md) */}
        <TopBar user={user} />

        {/* Page content */}
        <main className="flex-1 px-4 py-4 pb-24 sm:px-5 sm:py-5 md:px-6 md:py-6 md:pb-8 lg:px-10 lg:py-8">
          <div className="mx-auto w-full max-w-2xl sm:max-w-3xl md:max-w-4xl lg:max-w-5xl">
            {children}
          </div>
        </main>
      </div>

      {/* Bottom nav — mobile only (below md) */}
      <MobileNav userRole={user.role} />
    </div>
  )
}
