'use client'

import { useState, useTransition } from 'react'
import { UserPlus, UserCheck }      from 'lucide-react'
import { Button }                   from '@/components/ui/button'
import { toggleFollow }             from '@/actions/social'

interface FollowButtonProps {
  targetPlayerId:   string
  initialFollowing: boolean
  initialCount:     number
  className?:       string
}

export function FollowButton({
  targetPlayerId,
  initialFollowing,
  initialCount,
  className,
}: FollowButtonProps) {
  const [following, setFollowing] = useState(initialFollowing)
  const [count,     setCount]     = useState(initialCount)
  const [isPending, startTransition] = useTransition()

  function handleClick() {
    // Optimistic update
    const nextFollowing = !following
    setFollowing(nextFollowing)
    setCount(c => c + (nextFollowing ? 1 : -1))

    startTransition(async () => {
      try {
        const result = await toggleFollow(targetPlayerId)
        setFollowing(result.following)
      } catch {
        // Revert on error
        setFollowing(following)
        setCount(initialCount)
      }
    })
  }

  return (
    <Button
      variant={following ? 'ghost' : 'secondary'}
      size="sm"
      onClick={handleClick}
      disabled={isPending}
      className={className}
    >
      {following
        ? <UserCheck className="h-3.5 w-3.5" />
        : <UserPlus  className="h-3.5 w-3.5" />
      }
      {following ? 'Following' : 'Follow'}
      {count > 0 && (
        <span className="ml-1 text-xs opacity-60">{count}</span>
      )}
    </Button>
  )
}
