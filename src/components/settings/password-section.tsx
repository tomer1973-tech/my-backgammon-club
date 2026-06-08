'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { Lock }              from 'lucide-react'
import { updatePassword }    from '@/actions/auth'
import { Input }             from '@/components/ui/input'
import { Button }            from '@/components/ui/button'
import type { ActionResult } from '@/types'

const INITIAL: ActionResult = { success: true, data: undefined }

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" size="sm" isLoading={pending}>
      Update password
    </Button>
  )
}

export function PasswordSection() {
  const [state, formAction] = useFormState(updatePassword, INITIAL)

  // updatePassword calls redirect('/') on success, so state.success here
  // only ever shows if there's an error from validation
  return (
    <form action={formAction} className="space-y-4">
      <Input
        name="password"
        type="password"
        label="New password"
        placeholder="Min. 8 characters"
        autoComplete="new-password"
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
        <p className="rounded-lg border border-loss/40 bg-loss/10 px-4 py-3 text-sm text-loss">
          {state.error}
        </p>
      )}

      <SubmitButton />
    </form>
  )
}
