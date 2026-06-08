'use client'

import { useState, useTransition } from 'react'
import { Heart }                   from 'lucide-react'
import { cn }                      from '@/lib/utils'
import { toggleLike }              from '@/actions/social'

interface LikeButtonProps {
  matchId:       string
  initialLiked:  boolean
  initialCount:  number
  className?:    string
}

export function LikeButton({
  matchId,
  initialLiked,
  initialCount,
  className,
}: LikeButtonProps) {
  const [liked,     setLiked]     = useState(initialLiked)
  const [count,     setCount]     = useState(initialCount)
  const [isPending, startTransition] = useTransition()

  function handleClick() {
    // Optimistic update
    const nextLiked = !liked
    setLiked(nextLiked)
    setCount(c => c + (nextLiked ? 1 : -1))

    startTransition(async () => {
      try {
        const result = await toggleLike(matchId)
        setLiked(result.liked)
        setCount(result.count)
      } catch {
        // Revert on error
        setLiked(liked)
        setCount(initialCount)
      }
    })
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      aria-label={liked ? 'Unlike match' : 'Like match'}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-all',
        'border border-line hover:bg-surface-elevated disabled:pointer-events-none disabled:opacity-40',
        liked
          ? 'text-rose-500 border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20'
          : 'text-ink-muted hover:text-ink',
        className,
      )}
    >
      <Heart
        className={cn('h-4 w-4 transition-transform active:scale-110', liked && 'fill-rose-500')}
      />
      {count > 0 && <span>{count}</span>}
    </button>
  )
}
