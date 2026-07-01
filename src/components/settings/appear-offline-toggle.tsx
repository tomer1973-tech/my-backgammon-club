'use client'

import { useState, useTransition } from 'react'
import { EyeOff, Eye } from 'lucide-react'
import { setAppearOffline } from '@/actions/profile'

interface AppearOfflineToggleProps {
  initialValue: boolean
}

export function AppearOfflineToggle({ initialValue }: AppearOfflineToggleProps) {
  const [value, setValue] = useState(initialValue)
  const [, startTransition] = useTransition()

  function handleChange(checked: boolean) {
    setValue(checked) // optimistic
    startTransition(async () => {
      const res = await setAppearOffline(checked)
      if (!res.success) setValue(!checked) // revert on failure
    })
  }

  return (
    <div className="flex items-start gap-3 rounded-xl border border-line bg-surface-elevated px-4 py-3">
      <div className="mt-0.5">
        {value ? (
          <EyeOff className="h-4 w-4 text-ink-muted" />
        ) : (
          <Eye className="h-4 w-4 text-ink-muted" />
        )}
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium text-ink">Appear offline</p>
        <p className="text-xs text-ink-subtle mt-0.5">
          Hide your green online dot from other players. You can still see who's online and use the app normally.
        </p>
      </div>
      <label className="relative inline-flex items-center cursor-pointer mt-0.5">
        <input
          type="checkbox"
          checked={value}
          onChange={e => handleChange(e.target.checked)}
          className="sr-only peer"
        />
        <div className="w-10 h-5 bg-surface-base peer-checked:bg-gold rounded-full peer peer-focus:ring-2 peer-focus:ring-gold/40 transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-5" />
      </label>
    </div>
  )
}
