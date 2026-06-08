'use client'

import { useState, useTransition } from 'react'
import Link                        from 'next/link'
import { Users }                   from 'lucide-react'
import { Avatar }                  from '@/components/ui/avatar'
import { toggleFollow }            from '@/actions/social'
import { getFollowersList, getFollowingList } from '@/actions/profile'
import type { FollowListItem }     from '@/actions/profile'
import { cn }                      from '@/lib/utils'

interface FollowersModalProps {
  playerId:       string
  followerCount:  number
  followingCount: number
  isOwnProfile:   boolean
}

export function FollowersModal({
  playerId, followerCount, followingCount, isOwnProfile,
}: FollowersModalProps) {
  const [open, setOpen]   = useState(false)
  const [tab, setTab]     = useState<'followers' | 'following'>('followers')
  const [list, setList]   = useState<FollowListItem[]>([])
  const [loading, setLoading] = useState(false)

  async function openTab(t: 'followers' | 'following') {
    setTab(t)
    setOpen(true)
    setLoading(true)
    const data = t === 'followers'
      ? await getFollowersList(playerId)
      : await getFollowingList(playerId)
    setList(data)
    setLoading(false)
  }

  return (
    <>
      {/* Trigger counts */}
      <div className="flex gap-5">
        <button
          onClick={() => openTab('followers')}
          className="text-center hover:opacity-80 transition-opacity"
        >
          <p className="text-lg font-bold text-ink">{followerCount}</p>
          <p className="text-xs text-ink-subtle">Followers</p>
        </button>
        <button
          onClick={() => openTab('following')}
          className="text-center hover:opacity-80 transition-opacity"
        >
          <p className="text-lg font-bold text-ink">{followingCount}</p>
          <p className="text-xs text-ink-subtle">Following</p>
        </button>
      </div>

      {/* Modal overlay */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={e => { if (e.target === e.currentTarget) setOpen(false) }}
        >
          <div className="w-full max-w-sm rounded-2xl border border-line bg-surface-base shadow-2xl overflow-hidden">
            {/* Tabs */}
            <div className="flex border-b border-line">
              {(['followers', 'following'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => openTab(t)}
                  className={cn(
                    'flex-1 py-3 text-sm font-medium capitalize transition-colors',
                    tab === t ? 'text-gold border-b-2 border-gold' : 'text-ink-muted hover:text-ink',
                  )}
                >
                  {t === 'followers' ? `Followers (${followerCount})` : `Following (${followingCount})`}
                </button>
              ))}
              <button
                onClick={() => setOpen(false)}
                className="px-4 text-ink-subtle hover:text-ink text-xl leading-none"
              >×</button>
            </div>

            {/* List */}
            <div className="max-h-80 overflow-y-auto">
              {loading ? (
                <div className="py-10 text-center text-sm text-ink-muted">Loading…</div>
              ) : list.length === 0 ? (
                <div className="py-10 flex flex-col items-center gap-2 text-ink-subtle">
                  <Users className="h-8 w-8 opacity-30" />
                  <p className="text-sm">Nobody here yet</p>
                </div>
              ) : (
                list.map(p => (
                  <FollowRow
                    key={p.id}
                    person={p}
                    onClose={() => setOpen(false)}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function FollowRow({ person, onClose }: { person: FollowListItem; onClose: () => void }) {
  const [following, setFollowing]   = useState(person.isFollowing)
  const [pending, startTransition]  = useTransition()

  return (
    <div className="flex items-center gap-3 px-4 py-3 hover:bg-surface-raised transition-colors">
      <Link href={`/players/${person.id}`} onClick={onClose}>
        <Avatar name={person.name} src={person.avatarUrl} size="sm" />
      </Link>
      <div className="flex-1 min-w-0">
        <Link
          href={`/players/${person.id}`}
          onClick={onClose}
          className="text-sm font-medium text-ink hover:text-gold transition-colors truncate block"
        >
          {person.name}
          {person.isFriend && (
            <span className="ml-1.5 text-[10px] font-semibold text-win bg-win/10 px-1.5 py-0.5 rounded-full">
              Friends
            </span>
          )}
        </Link>
      </div>
      <button
        onClick={() => startTransition(async () => {
          const res = await toggleFollow(person.id)
          setFollowing(res.following)
        })}
        disabled={pending}
        className={cn(
          'shrink-0 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors',
          following
            ? 'bg-surface-elevated text-ink-muted hover:text-loss hover:bg-loss/10'
            : 'bg-gold/10 text-gold hover:bg-gold/20',
        )}
      >
        {following ? 'Unfollow' : 'Follow'}
      </button>
    </div>
  )
}
