'use client'

/**
 * CreateWizard — multi-step tournament creation form.
 *
 * Step 1: Basics     — name, location, description
 * Step 2: Format     — format, match length, max players
 * Step 3: Schedule   — start date, points per win
 * Step 4: Review     — summary before submit
 */

import { useState }              from 'react'
import { useRouter }             from 'next/navigation'
import { ChevronLeft, ChevronRight, Check, Trophy, Settings, Calendar, Eye } from 'lucide-react'
import { Button }                from '@/components/ui/button'
import { Input }                 from '@/components/ui/input'
import { Textarea }              from '@/components/ui/textarea'
import { Select }                from '@/components/ui/select'
import { FormatBadge }           from './format-badge'
import { createTournament }      from '@/actions/tournament'
import { cn }                    from '@/lib/utils'
import { TOURNAMENT_FORMAT_LABEL } from '@/types'
import type { TournamentFormat } from '@/types'

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

interface FormData {
  name:         string
  location:     string
  description:  string
  format:       TournamentFormat
  matchLength:  string
  maxPlayers:   string
  startDate:    string
  pointsPerWin: string
}

const INITIAL_FORM: FormData = {
  name:         '',
  location:     '',
  description:  '',
  format:       'ROUND_ROBIN',
  matchLength:  '',
  maxPlayers:   '',
  startDate:    '',
  pointsPerWin: '1',
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP CONFIG
// ─────────────────────────────────────────────────────────────────────────────

const STEPS = [
  { id: 'basics',   label: 'Basics',   icon: Trophy   },
  { id: 'format',   label: 'Format',   icon: Settings },
  { id: 'schedule', label: 'Schedule', icon: Calendar },
  { id: 'review',   label: 'Review',   icon: Eye      },
] as const

type StepId = (typeof STEPS)[number]['id']

// ─────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-2">
      {STEPS.map((step, i) => {
        const done    = i < current
        const active  = i === current
        const Icon    = step.icon
        return (
          <div key={step.id} className="flex items-center">
            <div
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all',
                done   && 'border-gold bg-gold text-surface-canvas',
                active && 'border-gold bg-transparent text-gold',
                !done && !active && 'border-line bg-transparent text-ink-subtle',
              )}
            >
              {done ? (
                <Check className="h-3.5 w-3.5" />
              ) : (
                <Icon className="h-3.5 w-3.5" />
              )}
            </div>
            {i < total - 1 && (
              <div className={cn('mx-1 h-0.5 w-8', i < current ? 'bg-gold' : 'bg-line')} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// FORMAT SELECTOR — card grid for picking format
// ─────────────────────────────────────────────────────────────────────────────

const FORMAT_DESCRIPTION: Record<TournamentFormat, string> = {
  ROUND_ROBIN:        'Every player plays every other player.',
  SINGLE_ELIMINATION: 'Single bracket — one loss and you\'re out.',
  DOUBLE_ELIMINATION: 'Two chances — eliminated after two losses.',
  SWISS:              'Paired by score each round, no player sits out.',
}

function FormatSelector({
  value,
  onChange,
}: {
  value:    TournamentFormat
  onChange: (v: TournamentFormat) => void
}) {
  const formats: TournamentFormat[] = [
    'ROUND_ROBIN',
    'SINGLE_ELIMINATION',
    'DOUBLE_ELIMINATION',
    'SWISS',
  ]

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {formats.map(fmt => (
        <button
          key={fmt}
          type="button"
          onClick={() => onChange(fmt)}
          className={cn(
            'flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition-all',
            value === fmt
              ? 'border-gold bg-gold/8 shadow-gold'
              : 'border-line bg-surface-raised hover:border-gold/40',
          )}
        >
          <FormatBadge format={fmt} />
          <p className="text-xs text-ink-muted leading-relaxed">
            {FORMAT_DESCRIPTION[fmt]}
          </p>
        </button>
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// REVIEW STEP
// ─────────────────────────────────────────────────────────────────────────────

function ReviewRow({ label, value }: { label: string; value: React.ReactNode }) {
  if (!value && value !== 0) return null
  return (
    <div className="flex items-start justify-between gap-4 py-2.5">
      <span className="text-sm text-ink-muted">{label}</span>
      <span className="text-right text-sm font-medium text-ink">{value}</span>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN WIZARD
// ─────────────────────────────────────────────────────────────────────────────

export function CreateWizard() {
  const router = useRouter()

  const [stepIndex, setStepIndex] = useState(0)
  const [form, setForm]           = useState<FormData>(INITIAL_FORM)
  const [errors, setErrors]       = useState<Partial<FormData>>({})
  const [submitting, setSubmitting] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  function update(field: keyof FormData, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
    setErrors(prev => ({ ...prev, [field]: '' }))
  }

  // ── Validation per step ──────────────────────────────────────────────────

  function validateStep(idx: number): boolean {
    const errs: Partial<FormData> = {}

    if (idx === 0) {
      if (!form.name.trim()) errs.name = 'Tournament name is required'
    }
    if (idx === 1) {
      if (form.matchLength && (isNaN(Number(form.matchLength)) || Number(form.matchLength) < 1)) {
        errs.matchLength = 'Must be a number ≥ 1'
      }
      if (form.maxPlayers && (isNaN(Number(form.maxPlayers)) || Number(form.maxPlayers) < 2)) {
        errs.maxPlayers = 'Must be ≥ 2'
      }
    }
    if (idx === 2) {
      const pts = Number(form.pointsPerWin)
      if (!form.pointsPerWin || isNaN(pts) || pts < 1) {
        errs.pointsPerWin = 'Points per win must be ≥ 1'
      }
    }

    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  function handleNext() {
    if (!validateStep(stepIndex)) return
    setStepIndex(i => Math.min(i + 1, STEPS.length - 1))
  }

  function handleBack() {
    setStepIndex(i => Math.max(i - 1, 0))
  }

  async function handleSubmit() {
    if (!validateStep(stepIndex)) return
    setSubmitting(true)
    setServerError(null)

    const result = await createTournament({
      name:         form.name.trim(),
      description:  form.description.trim() || undefined,
      location:     form.location.trim()    || undefined,
      format:       form.format,
      pointsPerWin: Number(form.pointsPerWin),
      matchLength:  form.matchLength ? Number(form.matchLength) : undefined,
      maxPlayers:   form.maxPlayers  ? Number(form.maxPlayers)  : undefined,
      startDate:    form.startDate   || undefined,
    })

    setSubmitting(false)

    if (result.success) {
      router.push(`/tournaments/${result.data.id}`)
    } else {
      setServerError(result.error)
    }
  }

  const currentStep = STEPS[stepIndex].id as StepId

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-xl">
      {/* Step indicator */}
      <div className="mb-8 flex justify-center">
        <StepIndicator current={stepIndex} total={STEPS.length} />
      </div>

      {/* Step content */}
      <div className="rounded-xl border border-line bg-surface-raised p-6 shadow-md">

        {/* STEP 1 — Basics */}
        {currentStep === 'basics' && (
          <div className="flex flex-col gap-5">
            <div>
              <h2 className="text-lg font-semibold text-ink">Tournament details</h2>
              <p className="mt-1 text-sm text-ink-muted">Start with the essentials.</p>
            </div>

            <Input
              label="Tournament name *"
              name="name"
              placeholder="Friday Night Backgammon"
              value={form.name}
              onChange={e => update('name', e.target.value)}
              error={errors.name}
              autoFocus
              maxLength={80}
            />
            <Input
              label="Location"
              name="location"
              placeholder="Tel Aviv, Beit Daniel"
              value={form.location}
              onChange={e => update('location', e.target.value)}
              maxLength={80}
            />
            <Textarea
              label="Description"
              name="description"
              placeholder="Rules, schedule notes, prize info…"
              value={form.description}
              onChange={e => update('description', e.target.value)}
              maxLength={500}
              hint={`${form.description.length}/500`}
            />
          </div>
        )}

        {/* STEP 2 — Format */}
        {currentStep === 'format' && (
          <div className="flex flex-col gap-5">
            <div>
              <h2 className="text-lg font-semibold text-ink">Tournament format</h2>
              <p className="mt-1 text-sm text-ink-muted">Choose how the competition is structured.</p>
            </div>

            <FormatSelector value={form.format} onChange={v => update('format', v)} />

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Match length (pts)"
                name="matchLength"
                type="number"
                placeholder="e.g. 7"
                value={form.matchLength}
                onChange={e => update('matchLength', e.target.value)}
                error={errors.matchLength}
                min={1}
                max={99}
                hint="Optional"
              />
              <Input
                label="Max players"
                name="maxPlayers"
                type="number"
                placeholder="Unlimited"
                value={form.maxPlayers}
                onChange={e => update('maxPlayers', e.target.value)}
                error={errors.maxPlayers}
                min={2}
                max={500}
                hint="Optional"
              />
            </div>
          </div>
        )}

        {/* STEP 3 — Schedule */}
        {currentStep === 'schedule' && (
          <div className="flex flex-col gap-5">
            <div>
              <h2 className="text-lg font-semibold text-ink">Scoring & schedule</h2>
              <p className="mt-1 text-sm text-ink-muted">Set how points are awarded.</p>
            </div>

            <Select
              label="Points per win"
              value={form.pointsPerWin}
              onChange={e => update('pointsPerWin', e.target.value)}
              options={[
                { value: '1',  label: '1 point' },
                { value: '2',  label: '2 points' },
                { value: '5',  label: '5 points' },
                { value: '10', label: '10 points' },
              ]}
              hint="Multiplied by the doubling cube value and gammon bonus when you record games."
            />

            <Input
              label="Start date"
              name="startDate"
              type="date"
              value={form.startDate}
              onChange={e => update('startDate', e.target.value)}
              hint="Optional"
            />
          </div>
        )}

        {/* STEP 4 — Review */}
        {currentStep === 'review' && (
          <div className="flex flex-col gap-4">
            <div>
              <h2 className="text-lg font-semibold text-ink">Review & create</h2>
              <p className="mt-1 text-sm text-ink-muted">Double-check everything before creating.</p>
            </div>

            <div className="divide-y divide-line/50 rounded-xl border border-line bg-surface-base px-4">
              <ReviewRow label="Name"         value={form.name} />
              <ReviewRow label="Location"     value={form.location  || '—'} />
              <ReviewRow label="Format"       value={<FormatBadge format={form.format} />} />
              <ReviewRow label="Match length" value={form.matchLength  ? `${form.matchLength} pts` : 'Not set'} />
              <ReviewRow label="Max players"  value={form.maxPlayers   ? form.maxPlayers             : 'Unlimited'} />
              <ReviewRow label="Points/win"   value={`${form.pointsPerWin} pt${Number(form.pointsPerWin) !== 1 ? 's' : ''}`} />
              <ReviewRow label="Start date"   value={form.startDate
                ? new Date(form.startDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
                : 'Not set'} />
              {form.description && (
                <ReviewRow label="Description" value={form.description} />
              )}
            </div>

            <p className="text-xs text-ink-subtle">
              The tournament will be created in <strong className="text-ink-muted">Draft</strong> status.
              Share the join code with players and set it to Active when you&apos;re ready.
            </p>

            {serverError && (
              <p className="rounded-lg border border-loss/40 bg-loss/10 px-3 py-2 text-sm text-loss">
                {serverError}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="mt-6 flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={handleBack}
          disabled={stepIndex === 0 || submitting}
          className="gap-1"
        >
          <ChevronLeft className="h-4 w-4" />
          Back
        </Button>

        {stepIndex < STEPS.length - 1 ? (
          <Button onClick={handleNext} className="gap-1">
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={handleSubmit} isLoading={submitting}>
            Create Tournament
          </Button>
        )}
      </div>
    </div>
  )
}
