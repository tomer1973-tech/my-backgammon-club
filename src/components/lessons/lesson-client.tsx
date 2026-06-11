'use client'

/**
 * LessonClient — interactive step-by-step backgammon tutorial.
 *
 * Reuses `BackgammonBoard` for both static diagram steps (no interaction)
 * and move steps, where the learner must play one of the step's
 * `sequences` using the same prefix-matching interaction as local play,
 * practice, and live matches.
 */

import { useState } from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, RotateCcw, CheckCircle2, PartyPopper } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { BackgammonBoard } from '@/components/backgammon'
import { applyMove, isSequencePrefix, type Move, type MoveSequence } from '@/lib/backgammon'
import type { Lesson } from '@/lib/lessons-content'

/** True once `movesPlayed` is a maximal sequence (no further moves possible). */
function nextMovesEmpty(sequences: Move[][], movesPlayed: Move[]): boolean {
  for (const seq of sequences) {
    if (seq.length <= movesPlayed.length) continue
    if (isSequencePrefix(movesPlayed, seq)) return false
  }
  return true
}

interface LessonClientProps {
  lesson:      Lesson
  nextLesson?: { slug: string; title: string }
}

export function LessonClient({ lesson, nextLesson }: LessonClientProps) {
  const [stepIndex, setStepIndex]     = useState(0)
  const [board, setBoard]             = useState(lesson.steps[0].board)
  const [movesPlayed, setMovesPlayed] = useState<Move[]>([])
  const [finished, setFinished]       = useState(false)

  const step       = lesson.steps[stepIndex]
  const isLastStep = stepIndex === lesson.steps.length - 1
  const sequences  = step.sequences ?? []
  const isMoveStep = sequences.length > 0
  const completed  = !isMoveStep || (movesPlayed.length > 0 && nextMovesEmpty(sequences, movesPlayed))

  const legalSequences: MoveSequence[] = sequences.map(moves => ({ moves, board: step.board }))

  function goToStep(index: number) {
    setStepIndex(index)
    setBoard(lesson.steps[index].board)
    setMovesPlayed([])
  }

  function handleMove(move: Move) {
    if (!step.toMove) return
    setBoard(prev => applyMove(prev, step.toMove!, move))
    setMovesPlayed(prev => [...prev, move])
  }

  function handleReset() {
    setBoard(step.board)
    setMovesPlayed([])
  }

  function handleNext() {
    if (isLastStep) { setFinished(true); return }
    goToStep(stepIndex + 1)
  }

  function handlePrev() {
    if (stepIndex === 0) return
    goToStep(stepIndex - 1)
  }

  if (finished) {
    return (
      <div className="flex flex-col gap-4 animate-fade-in">
        <BackLink lesson={lesson} />
        <div className="rounded-2xl border border-win/40 bg-win/5 p-8 text-center space-y-3">
          <PartyPopper className="mx-auto h-12 w-12 text-win" />
          <div>
            <p className="text-xs uppercase tracking-widest text-ink-subtle mb-1">Lesson complete</p>
            <h2 className="text-2xl font-black text-ink">{lesson.title}</h2>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          {nextLesson && (
            <Link href={`/lessons/${nextLesson.slug}`}>
              <Button size="lg" className="w-full gap-2">
                Next lesson: {nextLesson.title}
                <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
          )}
          <Link href="/lessons">
            <Button variant="secondary" size="lg" className="w-full">
              Back to all lessons
            </Button>
          </Link>
          <Button variant="secondary" size="lg" className="w-full" onClick={() => { setFinished(false); goToStep(0) }}>
            Replay this lesson
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 animate-fade-in">
      <BackLink lesson={lesson} />

      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs text-ink-subtle">
          <span>Step {stepIndex + 1} of {lesson.steps.length}</span>
        </div>
        <Progress value={stepIndex + 1} max={lesson.steps.length} />
      </div>

      <div className="rounded-2xl border border-line bg-surface-raised p-5 space-y-2">
        <h2 className="text-lg font-bold text-ink">{step.title}</h2>
        <div className="space-y-2 text-sm leading-relaxed text-ink-muted">
          {step.body.map((p, i) => <p key={i}>{p}</p>)}
        </div>
        {isMoveStep && completed && step.success && (
          <p className="flex items-start gap-2 rounded-xl border border-win/30 bg-win/5 px-3 py-2 text-sm font-medium text-win">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            {step.success}
          </p>
        )}
      </div>

      <BackgammonBoard
        board={board}
        perspective="white"
        toMove={isMoveStep && !completed ? step.toMove ?? null : null}
        dice={step.dice ?? null}
        legalSequences={legalSequences}
        movesPlayed={movesPlayed}
        onMove={handleMove}
        cube={step.cube}
        disabled={!isMoveStep || completed}
      />

      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" onClick={handlePrev} disabled={stepIndex === 0} className="gap-2">
          <ChevronLeft className="h-4 w-4" />
          Back
        </Button>

        {isMoveStep && movesPlayed.length > 0 && !completed && (
          <Button variant="secondary" onClick={handleReset} className="gap-2">
            <RotateCcw className="h-4 w-4" />
            Try again
          </Button>
        )}

        <Button onClick={handleNext} disabled={isMoveStep && !completed} className="ml-auto gap-2">
          {isLastStep ? 'Finish lesson' : 'Next'}
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

function BackLink({ lesson }: { lesson: Lesson }) {
  return (
    <div className="flex items-center justify-between">
      <Link
        href="/lessons"
        className="inline-flex items-center gap-1 text-sm text-ink-muted hover:text-ink transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
        Lessons
      </Link>
      <span className="text-sm font-medium text-ink">{lesson.title}</span>
    </div>
  )
}
