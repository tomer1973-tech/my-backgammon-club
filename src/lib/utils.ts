import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** Merge Tailwind classes without specificity conflicts. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Format a date as a short human-readable string. */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })
}

/** Format a date as relative time (e.g. "2 hours ago"). */
export function timeAgo(date: Date | string): string {
  const d    = typeof date === 'string' ? new Date(date) : date
  const secs = Math.floor((Date.now() - d.getTime()) / 1000)

  if (secs < 60)   return 'just now'
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`
  if (secs < 86400)return `${Math.floor(secs / 3600)}h ago`
  return formatDate(d)
}

/** Resolve a member's display name from the raw DB row. */
export function memberDisplayName(member: {
  player?: { name: string } | null
  guestName?: string | null
}): string {
  return member.player?.name ?? member.guestName ?? 'Unknown Player'
}

/** Generate a random 6-char uppercase alphanumeric tournament code. */
export function generateTournamentCode(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase()
}

/** Clamp a number between min and max. */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}
