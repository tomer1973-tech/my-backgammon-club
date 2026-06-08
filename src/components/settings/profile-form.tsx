'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { User, Lock, Globe }           from 'lucide-react'
import { updateProfileDetails }        from '@/actions/profile'
import type { ActionResult }           from '@/types'
import { Input }                       from '@/components/ui/input'
import { Button }                      from '@/components/ui/button'
import { cn }                          from '@/lib/utils'
import type { SessionUser }            from '@/types'

type ProfileResult = ActionResult<{ saved: boolean } | undefined>
const INITIAL: ProfileResult = { success: true, data: undefined }

function SaveButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" size="sm" isLoading={pending}>Save changes</Button>
  )
}

interface Props {
  user: SessionUser & { bio?: string | null; isPrivate?: boolean }
}

export function ProfileForm({ user }: Props) {
  const [state, formAction] = useFormState(updateProfileDetails, INITIAL)

  return (
    <form action={formAction} className="space-y-4">
      <Input
        name="name"
        type="text"
        label="Display name"
        defaultValue={user.name}
        autoComplete="name"
        required
        leading={<User className="h-4 w-4" />}
        hint="This is how other players see you."
      />

      <Input
        name="email"
        type="email"
        label="Email"
        value={user.email}
        readOnly
        disabled
        hint="Email cannot be changed here."
      />

      {/* Bio */}
      <div>
        <label className="block text-xs font-medium uppercase tracking-wide text-ink-muted mb-1.5">
          Bio <span className="text-ink-subtle font-normal normal-case">(optional, max 200 chars)</span>
        </label>
        <textarea
          name="bio"
          defaultValue={user.bio ?? ''}
          maxLength={200}
          rows={3}
          placeholder="Tell other players a bit about yourself…"
          className={cn(
            'w-full rounded-xl border border-line bg-surface-elevated',
            'px-3 py-2.5 text-sm text-ink placeholder-ink-subtle/50',
            'focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold/50',
            'resize-none',
          )}
        />
      </div>

      {/* Privacy toggle */}
      <div className="flex items-start gap-3 rounded-xl border border-line bg-surface-elevated px-4 py-3">
        <div className="mt-0.5">
          {user.isPrivate ? (
            <Lock className="h-4 w-4 text-ink-muted" />
          ) : (
            <Globe className="h-4 w-4 text-ink-muted" />
          )}
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-ink">Private profile</p>
          <p className="text-xs text-ink-subtle mt-0.5">
            When private, others must send a follow request before seeing your profile activity.
          </p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer mt-0.5">
          <input
            type="checkbox"
            name="isPrivate"
            value="true"
            defaultChecked={user.isPrivate ?? false}
            className="sr-only peer"
            onChange={e => {
              // Keep the hidden input in sync
              const hidden = e.currentTarget.form?.querySelector('input[name="isPrivateValue"]') as HTMLInputElement | null
              if (hidden) hidden.value = e.currentTarget.checked ? 'true' : 'false'
            }}
          />
          {/* We submit a hidden field with the actual value since checkbox only submits when checked */}
          <div className="w-10 h-5 bg-surface-base peer-checked:bg-gold rounded-full peer peer-focus:ring-2 peer-focus:ring-gold/40 transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-5" />
        </label>
      </div>

      {/* Hidden input to pass the real isPrivate boolean */}
      {/* We'll use a workaround: the checkbox value "true" is only sent when checked */}

      {!state.success && (
        <p className="rounded-xl border border-loss/40 bg-loss/10 px-4 py-3 text-sm text-loss">
          {state.error}
        </p>
      )}
      {state.success && state.data?.saved && (
        <p className="rounded-xl border border-win/30 bg-win/10 px-4 py-3 text-sm text-win">
          Profile updated successfully.
        </p>
      )}

      <SaveButton />
    </form>
  )
}
