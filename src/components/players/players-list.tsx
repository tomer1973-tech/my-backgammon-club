'use client'

import { useState }      from 'react'
import Link              from 'next/link'
import { Users, Trophy, Search } from 'lucide-react'
import { cn }            from '@/lib/utils'
import { Avatar }        from '@/components/ui/avatar'
import { FollowButton }  from '@/components/social/follow-button'
import { ChallengeButton } from '@/components/social/challenge-button'
import { MessageButton } from '@/components/social/message-button'
import { ShareInviteButton } from '@/components/social/share-invite-button'
import { OnlineDot }     from '@/components/presence/online-dot'

interface Player {
  id:               string
  name:             string
  email:            string
  avatarUrl:        string | null
  totalMatches:     number
  totalWins:        number
  totalLosses:      number
  totalTournaments: number
  winRate:          number
  followerCount:    number
  isFollowing:      boolean
  isFriend:         boolean
}

interface PlayersListProps {
  players: Player[]
  meId:    string | null
}

function winRateColor(rate: number) {
  if (rate >= 70) return 'text-win'
  if (rate >= 50) return 'text-gold'
  if (rate > 0)   return 'text-ink'
  return 'text-ink-subtle'
}

export function PlayersList({ players, meId }: PlayersListProps) {
  const [query, setQuery] = useState('')

  const filtered = query.trim()
    ? players.filter(p => p.name.toLowerCase().includes(query.toLowerCase()))
    : players

  return (
    <div className="flex flex-col gap-4">
      {/* Search + invite */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-subtle pointer-events-none" />
          <input
            type="search"
            placeholder="Search players…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="w-full rounded-xl border border-line bg-surface-raised pl-9 pr-4 py-2.5 text-sm text-ink placeholder:text-ink-subtle focus:outline-none focus:border-gold/50 focus:ring-1 focus:ring-gold/20 transition-colors"
          />
        </div>
        <ShareInviteButton
          label="Invite friends"
          text="Come play backgammon with me on My Backgammon Club!"
        />
      </div>

      {/* Column headers (desktop) */}
      <div className="hidden sm:grid grid-cols-[1fr_auto_auto_auto] gap-4 px-4 text-[10px] font-semibold uppercase tracking-wide text-ink-subtle">
        <span>Player</span>
        <span className="w-16 text-center">Tournaments</span>
        <span className="w-16 text-center">W – L</span>
        <span className="w-16 text-center">Win %</span>
      </div>

      {/* Player rows */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-line bg-surface-raised py-14 text-center">
          <Users className="h-10 w-10 text-ink-subtle/40" />
          <p className="text-sm text-ink-muted">
            {query ? `No players match "${query}"` : 'No players yet.'}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((p, idx) => {
            const isMe = p.id === meId
            return (
              <div
                key={p.id}
                className={cn(
                  'flex items-center gap-3 rounded-xl border px-4 py-3 transition-colors',
                  isMe
                    ? 'border-line-gold/50 bg-gold/5'
                    : 'border-line bg-surface-raised',
                )}
              >
                {/* Rank */}
                <span className="w-5 shrink-0 text-right text-xs font-medium text-ink-subtle">
                  {idx + 1}
                </span>

                {/* Avatar + name */}
                <Link href={`/players/${p.id}`} className="relative">
                  <Avatar name={p.name} src={p.avatarUrl}
                    className="ring-1 ring-white/20 ring-offset-1 ring-offset-surface-raised border-none hover:opacity-80 transition-opacity"
                  />
                  <OnlineDot playerId={p.id} className="absolute -bottom-0.5 -right-0.5" />
                </Link>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/players/${p.id}`}
                      className={cn('truncate font-medium hover:underline', isMe ? 'text-gold' : 'text-ink')}
                    >
                      {p.name}
                      {isMe && <span className="ml-1 text-xs font-normal text-gold/70">(you)</span>}
                    </Link>
                  </div>
                  <p className="text-xs text-ink-subtle truncate">{p.email}</p>
                </div>

                {/* Stats — desktop */}
                <div className="hidden sm:grid grid-cols-3 gap-4">
                  <div className="w-16 text-center">
                    <div className="flex items-center justify-center gap-1 text-sm font-medium text-ink">
                      <Trophy className="h-3 w-3 text-ink-subtle" />
                      {p.totalTournaments}
                    </div>
                  </div>
                  <div className="w-16 text-center">
                    <p className="text-sm font-medium text-ink">{p.totalWins}–{p.totalLosses}</p>
                  </div>
                  <div className="w-16 text-center">
                    <p className={cn('text-sm font-bold', winRateColor(p.winRate))}>
                      {p.totalMatches > 0 ? `${p.winRate}%` : '—'}
                    </p>
                  </div>
                </div>

                {/* Stats — mobile */}
                <div className="flex sm:hidden flex-col items-end gap-0.5 text-xs">
                  <span className={cn('font-bold', winRateColor(p.winRate))}>
                    {p.totalMatches > 0 ? `${p.winRate}%` : '—'}
                  </span>
                  <span className="text-ink-subtle">{p.totalWins}W {p.totalLosses}L</span>
                </div>

                {/* Social actions — skip self */}
                {!isMe && meId && (
                  <div className="flex flex-wrap items-center justify-end gap-2 sm:flex-nowrap">
                    <ChallengeButton targetPlayerId={p.id} />
                    <MessageButton targetPlayerId={p.id} targetName={p.name} />
                    <FollowButton
                      targetPlayerId={p.id}
                      initialFollowing={p.isFollowing}
                      initialCount={p.followerCount}
                    />
                    <ShareInviteButton
                      label="Share"
                      text={`Check out ${p.name} on My Backgammon Club!`}
                      url={typeof window !== 'undefined' ? `${window.location.origin}/players/${p.id}` : undefined}
                      className="hidden sm:inline-flex"
                    />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
