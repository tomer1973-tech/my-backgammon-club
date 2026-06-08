'use client'

import { useTransition } from 'react'
import { logout }        from '@/actions/auth'
import { Button }        from '@/components/ui/button'
import { LogOut }        from 'lucide-react'

export function LogoutButton() {
  const [pending, startTransition] = useTransition()

  return (
    <Button
      variant="destructive"
      size="sm"
      isLoading={pending}
      onClick={() => startTransition(() => logout())}
      className="gap-1.5 shrink-0"
    >
      <LogOut className="h-4 w-4" />
      Sign out
    </Button>
  )
}
