import { Skeleton } from '@/components/ui/skeleton'

export default function PlayerProfileLoading() {
  return (
    <div className="flex flex-col gap-6 animate-pulse">
      {/* Header */}
      <div>
        <Skeleton className="h-4 w-24" />
        <div className="mt-4 flex items-start gap-4">
          <Skeleton className="h-14 w-14 rounded-full shrink-0" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
      </div>

      {/* Performance overview */}
      <div className="space-y-3">
        <Skeleton className="h-3 w-40" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="rounded-xl border border-line bg-surface-raised p-4 space-y-3">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-9 w-14" />
            </div>
          ))}
        </div>
      </div>

      {/* Streak */}
      <div className="space-y-3">
        <Skeleton className="h-3 w-16" />
        <div className="grid grid-cols-2 gap-3">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="rounded-xl border border-line bg-surface-raised p-4 space-y-3">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-10 w-12" />
              <Skeleton className="h-3 w-20" />
            </div>
          ))}
        </div>
      </div>

      {/* Chart placeholder */}
      <div className="space-y-3">
        <Skeleton className="h-3 w-44" />
        <div className="rounded-xl border border-line bg-surface-raised p-4">
          <Skeleton className="h-48 w-full" />
        </div>
      </div>

      {/* H2H table */}
      <div className="space-y-3">
        <Skeleton className="h-3 w-32" />
        <div className="rounded-xl border border-line bg-surface-raised overflow-hidden">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3 border-b border-line last:border-0">
              <Skeleton className="h-4 w-32" />
              <div className="flex-1" />
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-4 w-10" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
