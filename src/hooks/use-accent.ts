'use client'

import { useState, useEffect, useCallback } from 'react'

export type AccentChoice = 'copper' | 'jade' | 'sapphire' | 'crimson'

const KEY = 'pb_accent'
const DEFAULT: AccentChoice = 'copper'

function applyAccent(choice: AccentChoice) {
  document.documentElement.setAttribute('data-accent', choice)
}

export function useAccent() {
  const [accent, setAccentState] = useState<AccentChoice>(DEFAULT)

  useEffect(() => {
    const saved = (localStorage.getItem(KEY) as AccentChoice) || DEFAULT
    setAccentState(saved)
  }, [])

  const setAccent = useCallback((choice: AccentChoice) => {
    setAccentState(choice)
    localStorage.setItem(KEY, choice)
    applyAccent(choice)
  }, [])

  return { accent, setAccent }
}
