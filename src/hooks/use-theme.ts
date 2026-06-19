'use client'

import { useState, useEffect, useCallback } from 'react'

export type ThemeChoice = 'dark' | 'light' | 'auto'

const KEY = 'pb_theme'

function applyTheme(choice: ThemeChoice) {
  const dark =
    choice === 'dark' ||
    (choice === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light')
}

export function useTheme() {
  const [theme, setThemeState] = useState<ThemeChoice>('auto')

  useEffect(() => {
    const saved = (localStorage.getItem(KEY) as ThemeChoice) || 'auto'
    setThemeState(saved)

    // Keep in sync when system preference changes (only matters in auto mode)
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => {
      const current = (localStorage.getItem(KEY) as ThemeChoice) || 'auto'
      if (current === 'auto') applyTheme('auto')
    }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  const setTheme = useCallback((choice: ThemeChoice) => {
    setThemeState(choice)
    localStorage.setItem(KEY, choice)
    applyTheme(choice)
  }, [])

  return { theme, setTheme }
}
