'use client'

/**
 * DoublingCube — premium animated doubling cube component.
 *
 * Visual design:
 *  - Names flank the cube left/right, like players seated either side of a
 *    real board — each side carries that player's own compact double button
 *    directly beneath their name, instead of two full-width stacked buttons.
 *  - Cube itself: dark charcoal face with gold glow, large value, smooth
 *    scale + glow animation on value change.
 *
 * Cube rules:
 *  - cubeOwnerId === null → center, EITHER player may offer a double
 *  - cubeOwnerId === player1Id → only player1 may offer the next double
 *  - cubeOwnerId === player2Id → only player2 may offer the next double
 *  - Max value is 64; cannot double beyond that
 *
 * The Offer Double button triggers a dialog (handled by parent) because
 * Accept / Decline must happen immediately on the same screen.
 */

import { useState, useEffect } from 'react'
import { cn }                  from '@/lib/utils'

interface DoublingCubeProps {
  cubeValue:    number
  cubeOwnerId:  string | null
  player1Id:    string
  player2Id:    string
  player1Name:  string
  player2Name:  string
  onOfferDouble: (offeringPlayerId: string) => void
  disabled?:    boolean   // true when match is over
}

// Dot patterns for each face value (like a real die)
const DOT_PATTERNS: Record<number, number[][]> = {
  1:  [[1, 1]],
  2:  [[0, 0], [2, 2]],
  4:  [[0, 0], [0, 2], [2, 0], [2, 2]],
  8:  [[0, 0], [0, 1], [0, 2], [1, 0], [1, 2], [2, 0], [2, 1], [2, 2]],
  16: [], // Use number label for high values
  32: [],
  64: [],
}

export function DoublingCube({
  cubeValue,
  cubeOwnerId,
  player1Id,
  player2Id,
  player1Name,
  player2Name,
  onOfferDouble,
  disabled = false,
}: DoublingCubeProps) {
  const [animating, setAnimating] = useState(false)
  const [prevValue, setPrevValue] = useState(cubeValue)

  // Trigger animation when value changes
  useEffect(() => {
    if (cubeValue !== prevValue) {
      setAnimating(true)
      setPrevValue(cubeValue)
      const t = setTimeout(() => setAnimating(false), 600)
      return () => clearTimeout(t)
    }
  }, [cubeValue, prevValue])

  const isCenter     = cubeOwnerId === null
  const p1Owns       = cubeOwnerId === player1Id
  const p2Owns       = cubeOwnerId === player2Id
  const p1CanDouble  = !disabled && cubeValue < 64 && (isCenter || p1Owns)
  const p2CanDouble  = !disabled && cubeValue < 64 && (isCenter || p2Owns)
  const nextValue    = cubeValue * 2
  const canOfferAtAll = !disabled && cubeValue < 64

  return (
    <div className="flex items-center justify-between gap-3">
      {/* Player 1 — name + their double button */}
      <PlayerSide
        name={player1Name}
        owns={p1Owns}
        canDouble={canOfferAtAll && (isCenter || p1Owns)}
        active={p1CanDouble}
        nextValue={nextValue}
        onDouble={() => onOfferDouble(player1Id)}
        align="left"
      />

      {/* Cube face */}
      <div className="flex flex-col items-center gap-1.5 shrink-0">
        <div
          className={cn(
            'relative flex h-16 w-16 items-center justify-center rounded-xl',
            'border-2 border-gold/60 bg-surface-canvas',
            'shadow-[0_0_18px_rgba(201,168,76,0.22)] transition-all duration-300',
            animating && 'scale-110 shadow-[0_0_32px_rgba(201,168,76,0.5)] border-gold',
            cubeValue > 1 && !animating && 'shadow-[0_0_24px_rgba(201,168,76,0.3)]',
          )}
        >
          <span
            className={cn(
              'select-none font-mono font-black text-gold transition-all duration-300',
              cubeValue >= 16 ? 'text-2xl' : 'text-3xl',
              animating && 'scale-110',
            )}
          >
            {cubeValue}
          </span>

          {cubeValue <= 8 && (
            <div className="absolute inset-2 pointer-events-none">
              {DOT_PATTERNS[cubeValue]?.map(([r, c], i) => (
                <div
                  key={i}
                  className="absolute h-1 w-1 rounded-full bg-gold/30"
                  style={{
                    top:  r === 0 ? '0%' : r === 1 ? '50%' : 'calc(100% - 4px)',
                    left: c === 0 ? '0%' : c === 1 ? '50%' : 'calc(100% - 4px)',
                    transform: 'translate(-50%, -50%)',
                  }}
                />
              ))}
            </div>
          )}
        </div>

        <span className="text-[10px] font-semibold uppercase tracking-widest text-ink-subtle whitespace-nowrap">
          {isCenter ? 'Center' : cubeValue >= 64 ? 'Maximum' : 'Owned'}
        </span>
      </div>

      {/* Player 2 — name + their double button */}
      <PlayerSide
        name={player2Name}
        owns={p2Owns}
        canDouble={canOfferAtAll && (isCenter || p2Owns)}
        active={p2CanDouble}
        nextValue={nextValue}
        onDouble={() => onOfferDouble(player2Id)}
        align="right"
      />
    </div>
  )
}

function PlayerSide({
  name, owns, canDouble, active, nextValue, onDouble, align,
}: {
  name:      string
  owns:      boolean
  canDouble: boolean
  active:    boolean
  nextValue: number
  onDouble:  () => void
  align:     'left' | 'right'
}) {
  return (
    <div className={cn('flex flex-1 flex-col gap-1.5 min-w-0', align === 'right' ? 'items-end' : 'items-start')}>
      <span className={cn(
        'truncate text-sm font-medium',
        owns ? 'text-gold' : 'text-ink-muted',
      )}>
        {name}
      </span>
      {canDouble && (
        <button
          onClick={onDouble}
          disabled={!active}
          className={cn(
            'rounded-lg border px-3 py-1.5 text-xs font-medium transition-all duration-200 whitespace-nowrap',
            active
              ? 'border-gold/50 bg-gold/10 text-gold hover:bg-gold/20 hover:border-gold active:scale-[0.98]'
              : 'border-line bg-transparent text-ink-subtle opacity-40 cursor-not-allowed',
          )}
        >
          Double → {nextValue}
        </button>
      )}
    </div>
  )
}
