import { LobbyLoadingSkeleton } from '@/components/ui/skeleton'

export default function LobbyLoading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="h-8 w-32 animate-pulse rounded-md bg-surface-elevated" />
        <div className="flex gap-2">
          <div className="h-9 w-20 animate-pulse rounded-lg bg-surface-elevated" />
          <div className="h-9 w-36 animate-pulse rounded-lg bg-surface-elevated" />
        </div>
      </div>
      <LobbyLoadingSkeleton />
    </div>
  )
}
