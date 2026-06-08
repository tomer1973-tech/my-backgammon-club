'use client'

/**
 * MatchSetup — player selection, target score, and optional scheduling.
 */

import { useState }          from 'react'
import { useRouter }         from 'next/navigation'
import { Users, Target, CalendarClock, Zap } from 'lucide-react'
import { Avatar }            from '@/components/ui/avatar'
import { Button }            from '@/components/ui/button'
import { Select }            from '@/components/ui/select'
import { Badge }             from '@/components/ui/badge'
import { createMatch }       from '@/actions/match'
import { cn }                from '@/lib/utils'
import type { Member }       from '@/types'

interface MatchSetupProps {
  tournamentId: string
  members:      Member[]
}

const TARGET_OPTIONS = [
  { value: 1,  label: '1 point  (quick)' },
  { value: 3,  label: '3 points' },
  { value: 5,  label: '5 points' },
  { value: 7,  label: '7 points  (standard)' },
  { value: 9,  label: '9 points' },
  { value: 11, label: '11 points (long)' },
  { value: 13, label: '13 points' },
  { value: 15, label: '15 points' },
]

/** Return a datetime-local string value floored to the next 15-min slot */
function defaultScheduledAt(): string {
  const d = new Date()
  d.setMinutes(Math.ceil(d.getMinutes() / 15) * 15, 0, 0)
  // datetime-local expects "YYYY-MM-DDTHH:mm"
  return d.toISOString().slice(0, 16)
}

export function MatchSetup({ tournamentId, members }: MatchSetupProps) {
  const router = useRouter()

  const [player1Id, setPlayer1Id]       = useState<string | null>(null)
  const [player2Id, setPlayer2Id]       = useState<string | null>(null)
  const [targetScore, setTargetScore]   = useState(7)
  const [scheduleMode, setScheduleMode] = useState(false)
  const [scheduledAt, setScheduledAt]   = useState(defaultScheduledAt)
  const [creating, setCreating]         = useState(false)
  const [error, setError]               = useState<string | null>(null)

  const p1 = members.find(m => m.id === player1Id)
  const p2 = members.find(m => m.id === player2Id)

  function selectPlayer1(id: string) {
    setPlayer1Id(id)
    if (player2Id === id) setPlayer2Id(null)
  }
  function selectPlayer2(id: string) {
    setPlayer2Id(id)
    if (player1Id === id) setPlayer1Id(null)
  }

  async function handleSubmit() {
    if (!player1Id || !player2Id) return
    setCreating(true)
    setError(null)

    // Build ISO string with timezone offset for scheduled matches
    const scheduledAtISO = scheduleMode
      ? new Date(scheduledAt).toISOString()
      : undefined

    const result = await createMatch({
      tournamentId,
      player1Id,
      player2Id,
      targetScore,
      scheduledAt: scheduledAtISO,
    })

    if (result.success) {
      if (result.data.scheduled) {
        router.push('/schedule')
      } else {
        router.push(`/tournaments/${tournamentId}/matches/${result.data.id}`)
      }
    } else {
      setError(result.error)
      setCreating(false)
    }
  }

  return (
    <div className="flex flex-col gap-6 max-w-xl mx-auto">

      {/* Selected pair summary */}
      <div className="rounded-xl border border-line bg-surface-raised p-4">
        <div className="flex items-center gap-4">
          <PlayerSlot member={p1} label="Player 1" />
          <div className="flex flex-col items-center gap-1 shrink-0">
            <Users className="h-5 w-5 text-ink-subtle" />
            <span className="text-xs text-ink-subtle">vs</span>
          </div>
          <PlayerSlot member={p2} label="Player 2" />
        </div>

        {/* Target score */}
        <div className="mt-4">
          <Select
            label="Race to (match length)"
            value={String(targetScore)}
            onChange={e => setTargetScore(Number(e.target.value))}
            options={TARGET_OPTIONS.map(o => ({ value: String(o.value), label: o.label }))}
          />
        </div>
      </div>

      {/* Schedule toggle */}
      <div className="rounded-xl border border-line bg-surface-raised overflow-hidden">
        <div className="flex">
          <button
            type="button"
            onClick={() => setScheduleMode(false)}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors',
              !scheduleMode
                ? 'bg-gold text-surface-canvas'
                : 'text-ink-muted hover:text-ink hover:bg-surface-elevated',
            )}
          >
            <Zap className="h-4 w-4" />
            Start now
          </button>
          <button
            type="button"
            onClick={() => setScheduleMode(true)}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors',
              scheduleMode
                ? 'bg-gold text-surface-canvas'
                : 'text-ink-muted hover:text-ink hover:bg-surface-elevated',
            )}
          >
            <CalendarClock className="h-4 w-4" />
            Schedule for later
          </button>
        </div>

        {scheduleMode && (
          <div className="px-4 pb-4 pt-3 border-t border-line">
            <label className="block text-xs font-medium text-ink-muted mb-1.5">
              Date &amp; time
            </label>
            <input
              type="datetime-local"
              value={scheduledAt}
              min={defaultScheduledAt()}
              onChange={e => setScheduledAt(e.target.value)}
              className={cn(
                'w-full rounded-lg border border-line bg-surface-elevated',
                'px-3 py-2 text-sm text-ink',
                'focus:outline-none focus:ring-2 focus:ring-gold/60 focus:border-gold/60',
                '[color-scheme:dark]',
              )}
            />
            <p className="mt-1.5 text-xs text-ink-subtle">
              The match will appear in both players&apos; schedules until started.
            </p>
          </div>
        )}
      </div>

      {/* Player grid */}
      <div className="space-y-3">
        <p className="text-sm font-medium text-ink-muted">Select two players</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {members.map(m => (
            <MemberCard
              key={m.id}
              member={m}
              isP1={m.id === player1Id}
              isP2={m.id === player2Id}
              onSelectP1={() => selectPlayer1(m.id)}
              onSelectP2={() => selectPlayer2(m.id)}
            />
          ))}
        </div>
      </div>

      {error && (
        <p className="rounded-lg border border-loss/40 bg-loss/10 px-3 py-2 text-sm text-loss">
          {error}
        </p>
      )}

      <Button
        onClick={handleSubmit}
        disabled={!player1Id || !player2Id}
        isLoading={creating}
        size="lg"
        className="w-full gap-2"
      >
        {scheduleMode ? (
          <><CalendarClock className="h-5 w-5" /> Schedule match — Race to {targetScore}</>
        ) : (
          <><Target className="h-5 w-5" /> Start match — Race to {targetScore}</>
        )}
      </Button>
    </div>
  )
}

function PlayerSlot({ member, label }: { member?: Member; label: string }) {
  return (
    <div className="flex-1 flex flex-col items-center gap-2 text-center">
      {member ? (
        <>
          <Avatar name={member.name} size="md" />
          <div>
            <p className="text-sm font-medium text-ink truncate">{member.name}</p>
            {member.isGuest && <Badge variant="guest" className="text-xs">Guest</Badge>}
          </div>
        </>
      ) : (
        <>
          <div className="h-10 w-10 rounded-full border-2 border-dashed border-line" />
          <p className="text-xs text-ink-subtle">{label}</p>
        </>
      )}
    </div>
  )
}

function MemberCard({
  member, isP1, isP2, onSelectP1, onSelectP2,
}: {
  member: Member; isP1: boolean; isP2: boolean
  onSelectP1: () => void; onSelectP2: () => void
}) {
  return (
    <div className={cn(
      'rounded-xl border p-3 transition-all',
      isP1 ? 'border-gold bg-gold/10' :
      isP2 ? 'border-win  bg-win/10'  :
      'border-line bg-surface-raised hover:border-gold/40',
    )}>
      <div className="flex flex-col items-center gap-2 text-center">
        <Avatar name={member.name} size="sm" />
        <p className="text-xs font-medium text-ink truncate w-full">{member.name}</p>
        <div className="flex gap-1 w-full">
          <button
            onClick={onSelectP1}
            className={cn(
              'flex-1 rounded text-[10px] font-semibold py-1 transition-colors',
              isP1 ? 'bg-gold text-surface-canvas' : 'bg-surface-elevated text-ink-subtle hover:bg-gold/20 hover:text-gold',
            )}
          >P1</button>
          <button
            onClick={onSelectP2}
            className={cn(
              'flex-1 rounded text-[10px] font-semibold py-1 transition-colors',
              isP2 ? 'bg-win text-surface-canvas' : 'bg-surface-elevated text-ink-subtle hover:bg-win/20 hover:text-win',
            )}
          >P2</button>
        </div>
      </div>
    </div>
  )
}
