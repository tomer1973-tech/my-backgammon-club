import { Skeleton } from '@/components/ui/skeleton'

export default function AnalyticsLoading() {
  return (
    <div className="flex flex-col gap-6 animate-pulse">
      {/* Header */}
      <div>
        <Skeleton className="h-4 w-24" />
        <div className="mt-3 flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-9 w-24" />
        </div>
      </div>

      {/* Snapshot KPIs */}
      <div className="space-y-3">
        <Skeleton className="h-3 w-36" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="rounded-xl border border-line bg-surface-raised p-4 space-y-3">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-9 w-14" />
              <Skeleton className="h-3 w-24" />
            </div>
          ))}
        </div>
      </div>

      {/* Recommendation */}
      <div className="space-y-3">
        <Skeleton className="h-3 w-44" />
        <div className="rounded-xl border border-line bg-surface-raised p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex-1 space-y-2 text-center">
              <Skeleton className="h-6 w-28 mx-auto" />
              <Skeleton className="h-3 w-16 mx-auto" />
            </div>
            <Skeleton className="h-6 w-8" />
            <div className="flex-1 space-y-2 text-center">
              <Skeleton className="h-6 w-28 mx-auto" />
              <Skeleton className="h-3 w-16 mx-auto" />
            </div>
          </div>
        </div>
      </div>

      {/* Hot streak */}
      <div className="space-y-3">
        <Skeleton className="h-3 w-24" />
        <div className="grid gap-3 sm:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="rounded-xl border border-line bg-surface-raised p-4 space-y-3">
              <Skeleton className="h-3 w-8" />
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-9 w-16" />
              <Skeleton className="h-3 w-full" />
            </div>
          ))}
        </div>
      </div>

      {/* Opening chart */}
      <div className="space-y-3">
        <Skeleton className="h-3 w-32" />
        <div className="rounded-xl border border-line bg-surface-raised p-4 space-y-3">
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    </div>
  )
}
