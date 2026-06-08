/**
 * /players/[id] — Public player profile
 */

import type { Metadata }   from 'next'
import { notFound }        from 'next/navigation'
import Link                from 'next/link'
import { Trophy, Swords, TrendingUp, Lock, Calendar, ChevronLeft, Star } from 'lucide-react'
import { getPlayerProfile } from '@/actions/profile'
import { getSessionUser }   from '@/lib/session'
import { Avatar }           from '@/components/ui/avatar'
import { Badge }            from '@/components/ui/badge'
import { ProfileFollowButton } from '@/components/profile/profile-follow-button'
import { FollowersModal }   from '@/components/profile/followers-modal'
import { cn }               from '@/lib/utils'

export const dynamic = 'force-dynamic'

interface Props { params: { id: string } }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const profile = await getPlayerProfile(params.id)
  return { title: profile ? `${profile.name} — My Backgammon Club` : 'Player not found' }
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-xl border border-line bg-surface-raised px-4 py-3 text-center">
      <p className="text-xl font-bold text-ink">{value}</p>
      {sub && <p className="text-xs text-gold font-medium">{sub}</p>}
      <p className="mt-0.5 text-[11px] text-ink-subtle uppercase tracking-wide">{label}</p>
    </div>
  )
}

export default async function PlayerProfilePage({ params }: Props) {
  const [profile, me] = await Promise.all([
    getPlayerProfile(params.id),
    getSessionUser(),
  ])

  if (!profile) notFound()

  const isOwnProfile = me?.id === profile.id
  const winRateColor = profile.winRate >= 70 ? 'text-win'
    : profile.winRate >= 50 ? 'text-gold'
    : 'text-ink'

  const roleLabel: Record<string, string> = {
    ADMIN: 'Admin',
    TOURNAMENT_MANAGER: 'Organizer',
    PLAYER: 'Player',
  }

  return (
    <div className="flex flex-col gap-6 animate-fade-in max-w-2xl mx-auto">
      {/* Back */}
      <Link
        href="/players"
        className="inline-flex items-center gap-1 text-sm text-ink-muted hover:text-ink transition-colors w-fit"
      >
        <ChevronLeft className="h-4 w-4" /> All players
      </Link>

      {/* ── Hero card ────────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-line bg-surface-raised overflow-hidden">
        {/* Banner gradient */}
        <div className="h-24 bg-gradient-to-br from-gold/20 via-surface-elevated to-surface-raised" />

        <div className="px-5 pb-5">
          {/* Avatar — overlaps banner */}
          <div className="-mt-10 mb-3 flex items-end justify-between gap-4">
            <Avatar
              name={profile.name}
              src={profile.avatarUrl}
              size="xl"
              className="border-4 border-surface-raised ring-0"
              style={{
                boxShadow: '0 0 0 2px rgba(255,255,255,0.08), 0 0 0 4px rgba(180,140,40,0.3)',
              } as React.CSSProperties}
            />
            <div className="pb-1 flex items-center gap-2">
              {!isOwnProfile && me && (
                <ProfileFollowButton
                  targetId={profile.id}
                  initialFollowing={profile.isFollowing}
                  initialRequested={profile.followRequestSent}
                  isFriend={profile.isFriend}
                />
              )}
              {isOwnProfile && (
                <Link
                  href="/settings"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-ink-muted hover:text-ink hover:bg-surface-elevated transition-colors"
                >
                  Edit profile
                </Link>
              )}
            </div>
          </div>

          {/* Name + badges */}
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-ink">{profile.name}</h1>
              {profile.isFriend && !isOwnProfile && (
                <span className="inline-flex items-center gap-1 rounded-full bg-win/10 px-2 py-0.5 text-[11px] font-semibold text-win">
                  <Star className="h-2.5 w-2.5" /> Friends
                </span>
              )}
              {profile.isPrivate && (
                <span className="inline-flex items-center gap-1 rounded-full bg-surface-elevated px-2 py-0.5 text-[11px] text-ink-subtle">
                  <Lock className="h-2.5 w-2.5" /> Private
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant={profile.role === 'ADMIN' ? 'admin' : profile.role === 'TOURNAMENT_MANAGER' ? 'manager' : 'player'}>
                {roleLabel[profile.role]}
              </Badge>
              <span className="flex items-center gap-1 text-xs text-ink-subtle">
                <Calendar className="h-3 w-3" />
                Joined {new Date(profile.joinedAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
              </span>
            </div>
            {profile.bio && (
              <p className="mt-2 text-sm text-ink-muted leading-relaxed">{profile.bio}</p>
            )}
          </div>

          {/* Followers / Following */}
          <div className="mt-4 pt-4 border-t border-line">
            <FollowersModal
              playerId={profile.id}
              followerCount={profile.followerCount}
              followingCount={profile.followingCount}
              isOwnProfile={isOwnProfile}
            />
          </div>
        </div>
      </div>

      {/* ── Stats grid ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Tournaments" value={profile.totalTournaments} />
        <StatCard label="Matches"     value={profile.totalMatches} />
        <StatCard
          label="Win / Loss"
          value={`${profile.totalWins}–${profile.totalLosses}`}
        />
        <StatCard
          label="Win Rate"
          value={profile.totalMatches > 0 ? `${profile.winRate}%` : '—'}
          sub={profile.totalMatches > 0 ? (profile.winRate >= 70 ? '🔥 Hot streak' : undefined) : undefined}
        />
      </div>

      {/* ── Recent matches ───────────────────────────────────────────────── */}
      {profile.recentMatches.length > 0 && (
        <div className="rounded-2xl border border-line bg-surface-raised overflow-hidden">
          <div className="px-5 py-4 border-b border-line">
            <h2 className="text-sm font-semibold text-ink flex items-center gap-2">
              <Swords className="h-4 w-4 text-gold" /> Recent Matches
            </h2>
          </div>
          <div className="divide-y divide-line/50">
            {profile.recentMatches.map(m => (
              <Link
                key={m.id}
                href={`/tournaments/${m.tournamentId}/matches/${m.id}`}
                className="flex items-center gap-3 px-5 py-3 hover:bg-surface-elevated transition-colors"
              >
                {/* Result pill */}
                <span className={cn(
                  'w-8 shrink-0 rounded-full py-0.5 text-center text-[11px] font-bold uppercase',
                  m.result === 'win'
                    ? 'bg-win/15 text-win'
                    : 'bg-loss/15 text-loss',
                )}>
                  {m.result === 'win' ? 'W' : 'L'}
                </span>

                {/* Opponent */}
                <Avatar name={m.opponentName} src={m.opponentAvatar} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-ink truncate">vs {m.opponentName}</p>
                  <p className="text-xs text-ink-subtle truncate">{m.tournamentName}</p>
                </div>

                {/* Score + date */}
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-ink">{m.score}</p>
                  <p className="text-xs text-ink-subtle">
                    {new Date(m.playedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
