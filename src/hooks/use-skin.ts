'use client'

import { useState, useEffect, useCallback } from 'react'

export type SkinChoice =
  | 'none' // use the regular theme + accent pickers instead
  | 'club-noir'
  | 'luxury-wood'
  | 'marquetry'
  | 'royal-sapphire'
  | 'emerald-modern'
  | 'midnight-jade'
  | 'champagne'

const KEY = 'pb_skin'
const DEFAULT: SkinChoice = 'none'

function applySkin(choice: SkinChoice) {
  if (choice === 'none') {
    document.documentElement.removeAttribute('data-skin')
  } else {
    document.documentElement.setAttribute('data-skin', choice)
  }
}

export function useSkin() {
  const [skin, setSkinState] = useState<SkinChoice>(DEFAULT)

  useEffect(() => {
    const saved = (localStorage.getItem(KEY) as SkinChoice) || DEFAULT
    setSkinState(saved)
  }, [])

  const setSkin = useCallback((choice: SkinChoice) => {
    setSkinState(choice)
    localStorage.setItem(KEY, choice)
    applySkin(choice)
  }, [])

  return { skin, setSkin }
}
