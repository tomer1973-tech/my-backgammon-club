'use client'

import { useTransition }   from 'react'
import { LogOut }          from 'lucide-react'
import { logout }          from '@/actions/auth'
import { Avatar }          from '@/components/ui/avatar'
import { Button }          from '@/components/ui/button'
import type { SessionUser } from '@/types'

interface TopBarProps {
  user:    SessionUser
  title?:  string
}

/**
 * Top bar — shown on mobile only (desktop uses the sidebar).
 * Displays the page title and user avatar with a logout button.
 */
export function TopBar({ user, title = 'Backgammon Club' }: TopBarProps) {
  const [isPending, startTransition] = useTransition()

  const handleLogout = () => {
    startTransition(async () => {
      await logout()
    })
  }

  return (
    <header
      className="lg:hidden sticky top-0 z-30
        flex items-center justify-between px-4 h-14
        bg-surface-base/90 backdrop-blur-md border-b border-line"
    >
      {/* Left: brand */}
      <div className="flex items-center gap-2">
        <span className="text-xl">🎲</span>
        <span className="font-display font-bold text-ink text-base tracking-tight">
          {title}
        </span>
      </div>

      {/* Right: avatar + logout */}
      <div className="flex items-center gap-2">
        <Avatar name={user.name} src={user.avatarUrl} size="sm" />
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={handleLogout}
          isLoading={isPending}
          aria-label="Sign out"
          title="Sign out"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  )
}
