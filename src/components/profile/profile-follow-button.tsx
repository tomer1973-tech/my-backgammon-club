'use client'

import { useState, useTransition } from 'react'
import { UserPlus, UserCheck, UserX, Clock } from 'lucide-react'
import { toggleFollow } from '@/actions/social'
import { Button }       from '@/components/ui/button'
import { cn }           from '@/lib/utils'

interface ProfileFollowButtonProps {
  targetId:       string
  initialFollowing: boolean
  initialRequested: boolean
  isFriend:        boolean
}

export function ProfileFollowButton({
  targetId,
  initialFollowing,
  initialRequested,
  isFriend,
}: ProfileFollowButtonProps) {
  const [following,  setFollowing]  = useState(initialFollowing)
  const [requested,  setRequested]  = useState(initialRequested)
  const [pending, startTransition]  = useTransition()

  function handleClick() {
    startTransition(async () => {
      const res = await toggleFollow(targetId)
      setFollowing(res.following)
      setRequested(res.requested ?? false)
    })
  }

  if (following) {
    return (
      <Button
        size="sm"
        variant="secondary"
        onClick={handleClick}
        isLoading={pending}
        className={cn('gap-1.5', isFriend && 'border-win/40 text-win hover:text-loss hover:border-loss/40')}
      >
        {isFriend
          ? <><UserCheck className="h-4 w-4" /> Friends</>
          : <><UserCheck className="h-4 w-4" /> Following</>
        }
      </Button>
    )
  }

  if (requested) {
    return (
      <Button size="sm" variant="secondary" disabled className="gap-1.5 text-ink-muted">
        <Clock className="h-4 w-4" /> Requested
      </Button>
    )
  }

  return (
    <Button size="sm" onClick={handleClick} isLoading={pending} className="gap-1.5">
      <UserPlus className="h-4 w-4" /> Follow
    </Button>
  )
}
