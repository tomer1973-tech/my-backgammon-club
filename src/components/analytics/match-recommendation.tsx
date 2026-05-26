import Link                 from 'next/link'
import { Swords, Sparkles } from 'lucide-react'
import { Button }           from '@/components/ui/button'
import type { MatchRecommendation } from '@/lib/analytics'

interface MatchRecommendationProps {
  recommendation: MatchRecommendation | null
  tournamentId:   string
  canManage:      boolean
}

export function MatchRecommendationCard({
  recommendation,
  tournamentId,
  canManage,
}: MatchRecommendationProps) {
  if (!recommendation) {
    return (
      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-ink-subtle">
          <Sparkles className="h-3.5 w-3.5 text-gold" />
          Suggested next match
        </h2>
        <div className="rounded-xl border border-line bg-surface-raised py-8 text-center">
          <p className="text-sm text-ink-muted">
            Need at least 2 available players to suggest a match.
          </p>
        </div>
      </section>
    )
  }

  const { player1, player2, score, neverPlayed, daysSinceLast, reasons } = recommendation

  return (
    <section className="space-y-3">
      <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-ink-subtle">
        <Sparkles className="h-3.5 w-3.5 text-gold" />
        Suggested next match
      </h2>

      <div className="rounded-xl border border-gold/20 bg-gold/5 p-4 shadow-[0_0_20px_rgba(201,168,76,0.08)]">
        {/* Players */}
        <div className="flex items-center gap-3">
          <div className="flex-1 text-center">
            <p className="text-lg font-bold text-ink">{player1.name}</p>
            <p className="text-xs text-ink-muted">
              {player1.wins}W · {player1.losses}L
            </p>
          </div>
          <div className="flex flex-col items-center">
            <Swords className="h-5 w-5 text-gold" />
            <span className="mt-0.5 text-xs font-semibold text-gold">VS</span>
          </div>
          <div className="flex-1 text-center">
            <p className="text-lg font-bold text-ink">{player2.name}</p>
            <p className="text-xs text-ink-muted">
              {player2.wins}W · {player2.losses}L
            </p>
          </div>
        </div>

        {/* Badges */}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {neverPlayed && (
            <span className="rounded-full bg-gold/15 px-2 py-0.5 text-xs font-medium text-gold">
              First meeting
            </span>
          )}
          {daysSinceLast !== null && !neverPlayed && (
            <span className="rounded-full bg-surface px-2 py-0.5 text-xs text-ink-muted">
              {daysSinceLast === 0 ? 'Played today' : `${daysSinceLast}d ago`}
            </span>
          )}
          <span className="rounded-full bg-surface px-2 py-0.5 text-xs text-ink-muted">
            Match score: {score}/100
          </span>
        </div>

        {/* Reasons */}
        <ul className="mt-3 space-y-1">
          {reasons.map((r, i) => (
            <li key={i} className="flex items-start gap-1.5 text-xs text-ink-muted">
              <span className="mt-0.5 text-gold">·</span>
              {r}
            </li>
          ))}
        </ul>

        {/* CTA */}
        {canManage && (
          <div className="mt-4">
            <Button asChild size="sm" className="w-full gap-1.5">
              <Link href={`/tournaments/${tournamentId}/matches/new`}>
                <Swords className="h-3.5 w-3.5" />
                Set up this match
              </Link>
            </Button>
          </div>
        )}
      </div>
    </section>
  )
}
