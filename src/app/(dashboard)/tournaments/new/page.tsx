import type { Metadata }  from 'next'
import Link               from 'next/link'
import { ChevronLeft }    from 'lucide-react'
import { CreateWizard }   from '@/components/tournament/create-wizard'

export const metadata: Metadata = { title: 'New Tournament — My Backgammon Club' }

export default function NewTournamentPage() {
  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      {/* Back navigation */}
      <div>
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-ink-muted hover:text-ink transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to lobby
        </Link>
        <h1 className="mt-3 text-2xl font-bold text-ink">Create tournament</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Set up a new backgammon tournament in a few steps.
        </p>
      </div>

      <CreateWizard />
    </div>
  )
}
