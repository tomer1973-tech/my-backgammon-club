'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Trophy } from 'lucide-react'
import { Avatar } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import type { LeaderboardEntry, RatedLeaderboardEntry } from '@/actions/admin'

const MEDAL: Record<number, { icon: string; cls: string }> = {
  0: { icon: '🥇', cls: 'text-gold border-gold/40 bg-gold/10' },
  1: { icon: '🥈', cls: 'text-ink border-line/60 bg-surface-elevated' },
  2: { icon: '🥉', cls: 'text-[#cd7f32] border-[#cd7f32]/40 bg-[#cd7f32]/10' },
}

interface LeaderboardTabsProps {
  tournamentPlayers: LeaderboardEntry[]
  ratedPlayers:      RatedLeaderboardEntry[]
}

export function LeaderboardTabs({ tournamentPlayers, ratedPlayers }: LeaderboardTabsProps) {
  const [tab, setTab] = useState<'tournament' | 'rated'>('rated')

  return (
    <div className="flex flex-col gap-4">
      {/* Tabs */}
      <div className="flex items-center gap-1 rounded-xl border border-line bg-surface-base p-1 self-start">
        <button
          onClick={() => setTab('rated')}
          className={cn(
            'rounded-lg px-3 py-1.5 text-xs font-medium transition-all',
            tab === 'rated' ? 'bg-surface-raised text-gold shadow-sm' : 'text-ink-subtle hover:text-ink-muted',
          )}
        >
          Ranked Rating
        </button>
        <button
          onClick={() => setTab('tournament')}
          className={cn(
            'rounded-lg px-3 py-1.5 text-xs font-medium transition-all',
            tab === 'tournament' ? 'bg-surface-raised text-gold shadow-sm' : 'text-ink-subtle hover:text-ink-muted',
          )}
        >
          Tournament Points
        </button>
      </div>

      {tab === 'rated' ? (
        <div className="rounded-xl border border-line bg-surface-raised overflow-hidden">
          <div className="grid grid-cols-[3rem_1fr_6rem] gap-3 px-5 py-3 border-b border-line bg-surface-elevated text-[10px] font-semibold uppercase tracking-widest text-ink-subtle">
            <span>#</span>
            <span>Player</span>
            <span className="text-right">Rating</span>
          </div>

          {ratedPlayers.length === 0 && (
            <div className="py-16 text-center">
              <Trophy className="h-10 w-10 text-ink-subtle/30 mx-auto mb-3" />
              <p className="text-sm text-ink-muted">No ranked matches played yet — play a Find Opponent match to get on the board!</p>
            </div>
          )}

          {ratedPlayers.map((player, i) => {
            const medal = MEDAL[i]
            return (
              <Link
                key={player.id}
                href={`/players/${player.id}`}
                className={cn(
                  'grid grid-cols-[3rem_1fr_6rem] gap-3 px-5 py-4 items-center border-b border-line/40 last:border-0',
                  'hover:bg-surface-elevated transition-colors group',
                  i === 0 && 'bg-gold/5',
                )}
              >
                <div className={cn(
                  'flex h-9 w-9 items-center justify-center rounded-xl text-sm font-bold border',
                  medal ? medal.cls : 'border-line bg-surface-elevated text-ink-muted',
                )}>
                  {medal ? medal.icon : `#${i + 1}`}
                </div>
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar name={player.name} src={player.avatarUrl} size="sm" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-ink truncate group-hover:text-gold transition-colors">
                      {player.name}
                    </p>
                    <p className="text-[11px] text-ink-subtle">{player.ratedGames} ranked match{player.ratedGames === 1 ? '' : 'es'}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-gold">{player.rating}</p>
                </div>
              </Link>
            )
          })}
        </div>
      ) : (
        <div className="rounded-xl border border-line bg-surface-raised overflow-hidden">
          <div className="grid grid-cols-[3rem_1fr_auto] sm:grid-cols-[3rem_1fr_6rem_6rem_6rem] gap-3 px-5 py-3 border-b border-line bg-surface-elevated text-[10px] font-semibold uppercase tracking-widest text-ink-subtle">
            <span>#</span>
            <span>Player</span>
            <span className="hidden sm:block text-right">Win rate</span>
            <span className="hidden sm:block text-right">W–L</span>
            <span className="text-right">Points</span>
          </div>

          {tournamentPlayers.length === 0 && (
            <div className="py-16 text-center">
              <Trophy className="h-10 w-10 text-ink-subtle/30 mx-auto mb-3" />
              <p className="text-sm text-ink-muted">No matches played yet — be the first!</p>
            </div>
          )}

          {tournamentPlayers.map((player, i) => {
            const medal = MEDAL[i]
            return (
              <Link
                key={player.id}
                href={`/players/${player.id}`}
                className={cn(
                  'grid grid-cols-[3rem_1fr_auto] sm:grid-cols-[3rem_1fr_6rem_6rem_6rem] gap-3',
                  'px-5 py-4 items-center border-b border-line/40 last:border-0',
                  'hover:bg-surface-elevated transition-colors group',
                  i === 0 && 'bg-gold/5',
                )}
              >
                <div className={cn(
                  'flex h-9 w-9 items-center justify-center rounded-xl text-sm font-bold border',
                  medal ? medal.cls : 'border-line bg-surface-elevated text-ink-muted',
                )}>
                  {medal ? medal.icon : `#${i + 1}`}
                </div>

                <div className="flex items-center gap-3 min-w-0">
                  <Avatar name={player.name} src={player.avatarUrl} size="sm" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-ink truncate group-hover:text-gold transition-colors">
                      {player.name}
                    </p>
                    <p className="text-[11px] text-ink-subtle">{player.wins + player.losses} matches</p>
                  </div>
                </div>

                <div className="hidden sm:block text-right">
                  <p className={cn('text-sm font-bold', player.winRate >= 60 ? 'text-win' : player.winRate >= 40 ? 'text-ink' : 'text-loss')}>
                    {player.winRate}%
                  </p>
                  <p className="text-[10px] text-ink-subtle">win rate</p>
                </div>

                <div className="hidden sm:block text-right">
                  <p className="text-sm font-semibold text-ink">{player.wins}–{player.losses}</p>
                  <p className="text-[10px] text-ink-subtle">W–L</p>
                </div>

                <div className="text-right">
                  <p className="text-sm font-bold text-gold">{player.points}</p>
                  <p className="text-[10px] text-ink-subtle">pts</p>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
