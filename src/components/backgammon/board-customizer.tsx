'use client'

/**
 * Shared board & dice theming: a `useBoardThemes` hook (localStorage-backed,
 * preference shared across Practice / Local Play / live matches) and a
 * `BoardCustomizeButton` that opens a swatch picker.
 */

import { useState, useEffect } from 'react'
import { Palette, Check }      from 'lucide-react'
import { Dialog, DialogFooter } from '@/components/ui/dialog'
import { Button }              from '@/components/ui/button'
import { cn }                  from '@/lib/utils'
import {
  BOARD_THEMES, DICE_THEMES, getBoardTheme, getDiceTheme,
  type BoardTheme, type DiceTheme,
} from '@/lib/backgammon/themes'

const BOARD_THEME_KEY = 'pb_board_theme'
const DICE_THEME_KEY  = 'pb_dice_theme'

export function useBoardThemes() {
  const [boardThemeId, setBoardThemeId] = useState('classic')
  const [diceThemeId, setDiceThemeId]   = useState('ivory')

  useEffect(() => {
    const b = localStorage.getItem(BOARD_THEME_KEY)
    const d = localStorage.getItem(DICE_THEME_KEY)
    if (b) setBoardThemeId(b)
    if (d) setDiceThemeId(d)
  }, [])

  function chooseBoardTheme(id: string) { setBoardThemeId(id); localStorage.setItem(BOARD_THEME_KEY, id) }
  function chooseDiceTheme(id: string)  { setDiceThemeId(id);  localStorage.setItem(DICE_THEME_KEY, id) }

  return {
    boardThemeId,
    diceThemeId,
    boardTheme: getBoardTheme(boardThemeId) as BoardTheme,
    diceTheme:  getDiceTheme(diceThemeId)   as DiceTheme,
    chooseBoardTheme,
    chooseDiceTheme,
  }
}

const DIE_PREVIEW_PIPS = [[0, 0], [0, 2], [1, 1], [2, 0], [2, 2]]

export function BoardCustomizeButton({
  boardThemeId, diceThemeId, onBoard, onDice, className,
}: {
  boardThemeId: string
  diceThemeId: string
  onBoard: (id: string) => void
  onDice: (id: string) => void
  className?: string
}) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-lg border border-line',
          'bg-surface-raised px-3 py-1.5 text-xs font-medium text-ink-muted',
          'hover:border-gold/40 hover:text-ink transition-colors',
          className,
        )}
      >
        <Palette className="h-3.5 w-3.5" />
        Board &amp; dice
      </button>

      <Dialog open={open} onClose={() => setOpen(false)} title="Board & dice" size="md">
        <div className="space-y-5">
          {/* Board */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-subtle">Board colour</p>
            <div className="grid grid-cols-5 gap-2">
              {BOARD_THEMES.map(t => (
                <button
                  key={t.id}
                  onClick={() => onBoard(t.id)}
                  className={cn(
                    'relative rounded-xl border-2 p-1.5 transition-all',
                    boardThemeId === t.id ? 'border-gold' : 'border-line hover:border-gold/40',
                  )}
                >
                  <div className="relative h-10 overflow-hidden rounded-lg" style={{ backgroundColor: t.felt }}>
                    <span className="absolute bottom-0 left-[18%] h-7 w-3" style={{ backgroundColor: t.pointDark, clipPath: 'polygon(0 100%,100% 100%,50% 0)' }} />
                    <span className="absolute bottom-0 left-[44%] h-7 w-3" style={{ backgroundColor: t.pointLight, clipPath: 'polygon(0 100%,100% 100%,50% 0)' }} />
                    <span className="absolute bottom-0 right-[18%] h-7 w-3" style={{ backgroundColor: t.pointDark, clipPath: 'polygon(0 100%,100% 100%,50% 0)' }} />
                  </div>
                  <span className="mt-1 block text-center text-[10px] font-medium text-ink-muted">{t.label}</span>
                  {boardThemeId === t.id && (
                    <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-gold text-surface-base">
                      <Check className="h-2.5 w-2.5" strokeWidth={3} />
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Dice */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-subtle">Dice colour</p>
            <div className="grid grid-cols-5 gap-2">
              {DICE_THEMES.map(d => (
                <button
                  key={d.id}
                  onClick={() => onDice(d.id)}
                  className={cn(
                    'relative flex flex-col items-center rounded-xl border-2 p-1.5 transition-all',
                    diceThemeId === d.id ? 'border-gold' : 'border-line hover:border-gold/40',
                  )}
                >
                  <div
                    className="grid h-10 w-10 grid-cols-3 grid-rows-3 gap-[2px] rounded-[26%] border p-[5px]"
                    style={{ backgroundColor: d.bg, borderColor: d.border }}
                  >
                    {Array.from({ length: 9 }).map((_, i) => {
                      const r = Math.floor(i / 3), c = i % 3
                      const on = DIE_PREVIEW_PIPS.some(([pr, pc]) => pr === r && pc === c)
                      return <span key={i} className="place-self-center h-[5px] w-[5px] rounded-full" style={on ? { backgroundColor: d.pip } : undefined} />
                    })}
                  </div>
                  <span className="mt-1 block text-center text-[10px] font-medium text-ink-muted">{d.label}</span>
                  {diceThemeId === d.id && (
                    <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-gold text-surface-base">
                      <Check className="h-2.5 w-2.5" strokeWidth={3} />
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={() => setOpen(false)} size="sm">Done</Button>
        </DialogFooter>
      </Dialog>
    </>
  )
}
