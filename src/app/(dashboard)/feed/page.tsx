import Link                  from 'next/link'
import { Rss, Trophy, UserPlus2, Users } from 'lucide-react'
import { Avatar }            from '@/components/ui/avatar'
import { Button }            from '@/components/ui/button'
import { getActivityFeed }   from '@/actions/activity'
import { getSessionUser }    from '@/lib/session'

export const metadata = { title: 'Activity Feed' }

function timeAgo(date: Date): string {
  const s = Math.floor((Date.now() - date.getTime()) / 1000)
  if (s < 60)   return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

export default async function FeedPage() {
  const user  = await getSessionUser()
  const { items, followingCount } = user
    ? await getActivityFeed()
    : { items: [], followingCount: 0 }

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Rss className="h-5 w-5 text-gold" />
          <h1 className="font-display text-2xl font-bold text-ink">Activity Feed</h1>
        </div>
        <p className="text-sm text-ink-muted">
          Recent matches from players you follow
        </p>
      </div>

      {/* Not signed in */}
      {!user && (
        <div className="rounded-2xl border border-line bg-surface-raised p-8 text-center space-y-3">
          <Rss className="mx-auto h-10 w-10 text-ink-subtle" />
          <p className="text-sm text-ink-muted">Sign in to see your personalised feed</p>
          <div className="flex justify-center gap-3">
            <Link href="/login?returnTo=/feed">
              <Button size="sm">Sign in</Button>
            </Link>
            <Link href="/register">
              <Button size="sm" variant="secondary">Create account</Button>
            </Link>
          </div>
        </div>
      )}

      {/* No one followed yet */}
      {user && followingCount === 0 && (
        <div className="rounded-2xl border border-line bg-surface-raised p-8 text-center space-y-3">
          <Users className="mx-auto h-10 w-10 text-ink-subtle" />
          <div>
            <p className="font-semibold text-ink">No one to follow yet</p>
            <p className="text-sm text-ink-muted mt-1">Follow players to see their match activity here</p>
          </div>
          <Link href="/players">
            <Button size="sm" className="gap-2">
              <UserPlus2 className="h-4 w-4" />
              Browse players
            </Button>
          </Link>
        </div>
      )}

      {/* Empty feed (following people but no matches yet) */}
      {user && followingCount > 0 && items.length === 0 && (
        <div className="rounded-2xl border border-line bg-surface-raised p-8 text-center space-y-2">
          <Trophy className="mx-auto h-10 w-10 text-ink-subtle" />
          <p className="text-sm text-ink-muted">
            The players you follow haven&apos;t completed any matches yet.<br />
            Check back after the next tournament!
          </p>
        </div>
      )}

      {/* Feed items */}
      {items.length > 0 && (
        <div className="space-y-3">
          {items.map(item => {
            const isP1Win = item.winnerId === item.player1Id
            const isP2Win = item.winnerId === item.player2Id
            return (
              <Link
                key={item.id}
                href={`/tournaments/${item.tournamentId}`}
                className="block rounded-2xl border border-line bg-surface-raised p-4
                  hover:border-gold/30 transition-colors"
              >
                {/* Tournament name */}
                <div className="mb-3 flex items-center gap-1.5">
                  <Trophy className="h-3.5 w-3.5 text-ink-subtle" />
                  <span className="text-xs font-medium text-ink-muted truncate">
                    {item.tournamentName}
                  </span>
                  <span className="ml-auto shrink-0 text-[11px] text-ink-subtle">
                    {timeAgo(new Date(item.completedAt))}
                  </span>
                </div>

                {/* Players + result */}
                <div className="flex items-center gap-3">
                  <div className={`flex flex-1 items-center gap-2 min-w-0 ${isP1Win ? 'opacity-100' : 'opacity-60'}`}>
                    <Avatar name={item.player1Name ?? '?'} src={item.player1Avatar ?? undefined} size="sm" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-ink">{item.player1Name ?? 'TBD'}</p>
                      {isP1Win && (
                        <span className="text-[10px] font-semibold text-win uppercase tracking-wide">Winner</span>
                      )}
                    </div>
                  </div>

                  <span className="shrink-0 text-xs font-black text-ink-subtle">vs</span>

                  <div className={`flex flex-1 items-center justify-end gap-2 min-w-0 ${isP2Win ? 'opacity-100' : 'opacity-60'}`}>
                    <div className="min-w-0 text-right">
                      <p className="truncate text-sm font-semibold text-ink">{item.player2Name ?? 'TBD'}</p>
                      {isP2Win && (
                        <span className="text-[10px] font-semibold text-win uppercase tracking-wide">Winner</span>
                      )}
                    </div>
                    <Avatar name={item.player2Name ?? '?'} src={item.player2Avatar ?? undefined} size="sm" />
                  </div>
                </div>

                {/* Like count */}
                {item.likeCount > 0 && (
                  <div className="mt-2.5 flex items-center gap-1 text-[11px] text-ink-subtle">
                    <span>❤️</span>
                    <span>{item.likeCount} like{item.likeCount !== 1 ? 's' : ''}</span>
                  </div>
                )}
              </Link>
            )
          })}
        </div>
      )}

      {/* Following stats footer */}
      {user && followingCount > 0 && (
        <p className="text-center text-xs text-ink-subtle">
          Following {followingCount} player{followingCount !== 1 ? 's' : ''} ·{' '}
          <Link href="/players" className="text-gold hover:text-gold/80 transition-colors">
            Discover more
          </Link>
        </p>
      )}

    </div>
  )
}
