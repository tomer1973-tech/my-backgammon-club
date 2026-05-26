'use client'

import { useState, useRef, useEffect } from 'react'
import { Download, FileText, Table, Users, ChevronDown, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn }     from '@/lib/utils'

interface ExportMenuProps {
  tournamentId: string
  className?:   string
}

interface ExportOption {
  label:    string
  sub:      string
  href:     string
  icon:     React.ElementType
}

export function ExportMenu({ tournamentId, className }: ExportMenuProps) {
  const [open, setOpen]         = useState(false)
  const [loading, setLoading]   = useState<string | null>(null)
  const menuRef                 = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  const options: ExportOption[] = [
    {
      label: 'Standings CSV',
      sub:   'Rankings, wins, losses, points',
      href:  `/api/tournaments/${tournamentId}/export/standings`,
      icon:  Table,
    },
    {
      label: 'Match History CSV',
      sub:   'All matches with scores and openings',
      href:  `/api/tournaments/${tournamentId}/export/matches`,
      icon:  Table,
    },
    {
      label: 'Player Stats CSV',
      sub:   'Win rates, cube usage, streaks',
      href:  `/api/tournaments/${tournamentId}/export/players`,
      icon:  Users,
    },
    {
      label: 'Tournament Report PDF',
      sub:   'Full report — standings, history, analytics',
      href:  `/api/tournaments/${tournamentId}/export/report`,
      icon:  FileText,
    },
  ]

  async function handleDownload(href: string, label: string) {
    setLoading(label)
    setOpen(false)
    try {
      const res  = await fetch(href)
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      // Try to get filename from header
      const disp = res.headers.get('Content-Disposition') ?? ''
      const match = disp.match(/filename="([^"]+)"/)
      a.download = match?.[1] ?? 'export'
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setLoading(null)
    }
  }

  return (
    <div ref={menuRef} className={cn('relative', className)}>
      <Button
        variant="ghost"
        size="sm"
        className="gap-1.5"
        onClick={() => setOpen(v => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Download className="h-4 w-4" />
        )}
        Export
        <ChevronDown className={cn('h-3 w-3 transition-transform', open && 'rotate-180')} />
      </Button>

      {open && (
        <div
          role="listbox"
          className="absolute right-0 top-full z-50 mt-1.5 w-64 rounded-xl border border-line bg-surface-raised shadow-xl shadow-black/40 py-1.5"
        >
          {options.map(opt => {
            const Icon = opt.icon
            return (
              <button
                key={opt.href}
                role="option"
                disabled={loading !== null}
                onClick={() => handleDownload(opt.href, opt.label)}
                className="flex w-full items-start gap-3 px-3 py-2.5 text-left transition-colors hover:bg-surface-elevated disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Icon className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink">{opt.label}</p>
                  <p className="text-xs text-ink-muted truncate">{opt.sub}</p>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
