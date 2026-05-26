'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { Mail, Lock }                  from 'lucide-react'
import { login }                       from '@/actions/auth'
import { Button }                      from '@/components/ui/button'
import { Input }                       from '@/components/ui/input'
import type { ActionResult }           from '@/types'

const INITIAL_STATE: ActionResult = { success: true, data: undefined }

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" className="w-full" size="lg" isLoading={pending}>
      Sign In
    </Button>
  )
}

export function LoginForm() {
  const [state, formAction] = useFormState(login, INITIAL_STATE)

  return (
    <form action={formAction} className="space-y-4">
      <Input
        name="email"
        type="email"
        label="Email"
        placeholder="you@example.com"
        autoComplete="email"
        autoFocus
        required
        leading={<Mail className="h-4 w-4" />}
      />

      <Input
        name="password"
        type="password"
        label="Password"
        placeholder="••••••••"
        autoComplete="current-password"
        required
        leading={<Lock className="h-4 w-4" />}
      />

      {/* Server-side error */}
      {state && !state.success && (
        <div className="rounded-lg border border-loss/40 bg-loss/10 px-4 py-3 text-sm text-loss">
          {state.error}
        </div>
      )}

      <SubmitButton />
    </form>
  )
}
