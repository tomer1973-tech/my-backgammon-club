'use client'

/**
 * DoublingCube — premium animated doubling cube component.
 *
 * Visual design:
 *  - Large square element, dark charcoal background with gold glow
 *  - Value displayed in large gold font at center
 *  - Ownership indicator below (CENTER / "Player owns")
 *  - Smooth scale + glow animation on value change
 *  - Pulsing offer button when a double can be offered
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

  const isCenter          = cubeOwnerId === null
  const p1CanDouble       = !disabled && cubeValue < 64 && (isCenter || cubeOwnerId === player1Id)
  const p2CanDouble       = !disabled && cubeValue < 64 && (isCenter || cubeOwnerId === player2Id)
  const ownerName         = cubeOwnerId === player1Id ? player1Name
                          : cubeOwnerId === player2Id ? player2Name
                          : null
  const nextValue         = cubeValue * 2

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Cube face */}
      <div
        className={cn(
          'relative flex h-24 w-24 items-center justify-center rounded-2xl',
          'border-2 border-gold/60 bg-surface-canvas',
          'shadow-[0_0_24px_rgba(201,168,76,0.25)] transition-all duration-300',
          animating && 'scale-110 shadow-[0_0_40px_rgba(201,168,76,0.5)] border-gold',
          cubeValue > 1 && !animating && 'shadow-[0_0_32px_rgba(201,168,76,0.35)]',
        )}
      >
        {/* Number */}
        <span
          className={cn(
            'select-none font-mono font-black text-gold transition-all duration-300',
            cubeValue >= 16 ? 'text-3xl' : 'text-4xl',
            animating && 'scale-110',
          )}
        >
          {cubeValue}
        </span>

        {/* Subtle corner dots for low values */}
        {cubeValue <= 8 && (
          <div className="absolute inset-3 pointer-events-none">
            {DOT_PATTERNS[cubeValue]?.map(([r, c], i) => (
              <div
                key={i}
                className="absolute h-1.5 w-1.5 rounded-full bg-gold/30"
                style={{
                  top:  r === 0 ? '0%' : r === 1 ? '50%' : 'calc(100% - 6px)',
                  left: c === 0 ? '0%' : c === 1 ? '50%' : 'calc(100% - 6px)',
                  transform: 'translate(-50%, -50%)',
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Ownership label */}
      <div className="text-center">
        {isCenter ? (
          <span className="text-xs font-semibold uppercase tracking-widest text-ink-subtle">
            Center
          </span>
        ) : (
          <span className="text-xs text-ink-muted">
            <span className="font-semibold text-gold">{ownerName}</span>{' '}
            <span className="text-ink-subtle">owns</span>
          </span>
        )}
        {cubeValue > 1 && (
          <p className="mt-0.5 text-xs text-ink-subtle">
            ×{cubeValue} stakes
          </p>
        )}
      </div>

      {/* Double offer buttons */}
      {!disabled && cubeValue < 64 && (
        <div className="flex flex-col items-center gap-2 w-full">
          {(isCenter || cubeOwnerId === player1Id) && (
            <OfferButton
              label={`${isCenter ? player1Name : 'You'} double → ${nextValue}`}
              active={p1CanDouble}
              onClick={() => onOfferDouble(player1Id)}
            />
          )}
          {(isCenter || cubeOwnerId === player2Id) && (
            <OfferButton
              label={`${isCenter ? player2Name : 'You'} double → ${nextValue}`}
              active={p2CanDouble}
              onClick={() => onOfferDouble(player2Id)}
            />
          )}
        </div>
      )}
      {cubeValue >= 64 && (
        <p className="text-xs text-ink-subtle">Cube at maximum (64)</p>
      )}
    </div>
  )
}

function OfferButton({
  label,
  active,
  onClick,
}: {
  label:   string
  active:  boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      disabled={!active}
      className={cn(
        'w-full rounded-lg border px-4 py-2 text-xs font-medium transition-all duration-200',
        active
          ? 'border-gold/50 bg-gold/10 text-gold hover:bg-gold/20 hover:border-gold active:scale-[0.98]'
          : 'border-line bg-transparent text-ink-subtle opacity-40 cursor-not-allowed',
      )}
    >
      {label}
    </button>
  )
}
