'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { Lock }                        from 'lucide-react'
import { updatePassword }              from '@/actions/auth'
import { Button }                      from '@/components/ui/button'
import { Input }                       from '@/components/ui/input'
import type { ActionResult }           from '@/types'

const INITIAL_STATE: ActionResult = { success: true, data: undefined }

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" className="w-full" size="lg" isLoading={pending}>
      Update Password
    </Button>
  )
}

export function ResetPasswordForm() {
  const [state, formAction] = useFormState(updatePassword, INITIAL_STATE)

  return (
    <form action={formAction} className="space-y-4">
      <Input
        name="password"
        type="password"
        label="New password"
        placeholder="Min. 8 characters"
        autoComplete="new-password"
        autoFocus
        required
        leading={<Lock className="h-4 w-4" />}
        hint="At least 8 characters"
      />

      <Input
        name="confirmPassword"
        type="password"
        label="Confirm new password"
        placeholder="••••••••"
        autoComplete="new-password"
        required
        leading={<Lock className="h-4 w-4" />}
      />

      {!state.success && (
        <div className="rounded-lg border border-loss/40 bg-loss/10 px-4 py-3 text-sm text-loss">
          {state.error}
        </div>
      )}

      <SubmitButton />
    </form>
  )
}
