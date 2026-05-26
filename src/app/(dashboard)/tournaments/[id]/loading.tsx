import { Skeleton, PlayerRowSkeleton } from '@/components/ui/skeleton'

export default function TournamentDetailLoading() {
  return (
    <div className="flex flex-col gap-6 animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-9 w-36" />
      </div>

      {/* Overview card */}
      <div className="rounded-xl border border-line bg-surface-raised p-6 space-y-4">
        <div className="flex items-start justify-between">
          <div className="space-y-2 flex-1">
            <Skeleton className="h-8 w-1/2" />
            <Skeleton className="h-4 w-3/4" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-6 w-16 rounded-full" />
            <Skeleton className="h-6 w-24 rounded-full" />
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-line bg-surface-raised p-5 space-y-4">
          <Skeleton className="h-3 w-16" />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="h-7 w-7 rounded-lg" />
              <div className="space-y-1.5 flex-1">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
          ))}
        </div>
        <div className="rounded-xl border border-line bg-surface-raised p-5 space-y-4">
          <Skeleton className="h-3 w-20" />
          <div className="grid grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-lg bg-surface-elevated p-3 space-y-2">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-6 w-12" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Player roster */}
      <div className="rounded-xl border border-line bg-surface-raised p-5 space-y-3">
        <div className="flex items-center justify-between mb-1">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-8 w-28" />
        </div>
        {Array.from({ length: 4 }).map((_, i) => (
          <PlayerRowSkeleton key={i} />
        ))}
      </div>
    </div>
  )
}
