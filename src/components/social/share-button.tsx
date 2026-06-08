'use client'

import { useState, useRef, useEffect } from 'react'
import { Share2, Facebook, Twitter, MessageCircle, Link2, Check, Instagram } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ShareButtonProps {
  matchId:       string
  player1Name:   string
  player2Name:   string
  player1Score:  number
  player2Score:  number
  winnerName:    string
  tournamentName?: string
  className?:    string
}

export function ShareButton({
  matchId,
  player1Name,
  player2Name,
  player1Score,
  player2Score,
  winnerName,
  tournamentName,
  className,
}: ShareButtonProps) {
  const [open,    setOpen]    = useState(false)
  const [copied,  setCopied]  = useState(false)
  const containerRef          = useRef<HTMLDivElement>(null)

  // Derive loser details
  const loserName  = winnerName === player1Name ? player2Name : player1Name
  const winnerScore = winnerName === player1Name ? player1Score : player2Score
  const loserScore  = winnerName === player1Name ? player2Score : player1Score

  const shareText = tournamentName
    ? `🎲 ${winnerName} beat ${loserName} ${winnerScore}-${loserScore} in backgammon! #${tournamentName.replace(/\s+/g, '')}`
    : `🎲 ${winnerName} beat ${loserName} ${winnerScore}-${loserScore} in backgammon!`

  // Click-outside to close
  useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  function getShareUrl(): string {
    if (typeof window === 'undefined') return ''
    return window.location.href
  }

  async function handleNativeShare() {
    if (!navigator.share) return
    try {
      await navigator.share({
        title: `Backgammon match: ${player1Name} vs ${player2Name}`,
        text:  shareText,
        url:   getShareUrl(),
      })
    } catch { /* user cancelled */ }
    setOpen(false)
  }

  function openWindow(url: string) {
    window.open(url, '_blank', 'width=600,height=400,noopener,noreferrer')
    setOpen(false)
  }

  function handleFacebook() {
    openWindow(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(getShareUrl())}`)
  }

  function handleTwitter() {
    const text = `${shareText} ${getShareUrl()}`
    openWindow(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`)
  }

  function handleWhatsApp() {
    const text = `${shareText} ${getShareUrl()}`
    openWindow(`https://wa.me/?text=${encodeURIComponent(text)}`)
  }

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(getShareUrl())
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* clipboard denied */ }
  }

  const canNativeShare = typeof navigator !== 'undefined' && !!navigator.share

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <button
        onClick={() => setOpen(o => !o)}
        aria-label="Share match"
        className={cn(
          'inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-all',
          'border border-line bg-transparent text-ink-muted hover:bg-surface-elevated hover:text-ink',
        )}
      >
        <Share2 className="h-4 w-4" />
        Share
      </button>

      {open && (
        <div className="absolute bottom-full left-0 mb-2 z-50 w-64 rounded-xl border border-line bg-surface-elevated shadow-lg">
          <div className="p-3">
            <p className="mb-3 text-xs text-ink-subtle font-medium uppercase tracking-wide">Share this match</p>

            <div className="flex flex-col gap-1">
              {/* Native share — mobile only */}
              {canNativeShare && (
                <button
                  onClick={handleNativeShare}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-ink hover:bg-surface-raised transition-colors"
                >
                  <Share2 className="h-4 w-4 text-gold" />
                  Share via…
                </button>
              )}

              {/* Facebook */}
              <button
                onClick={handleFacebook}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-ink hover:bg-surface-raised transition-colors"
              >
                <Facebook className="h-4 w-4 text-blue-500" />
                Facebook
              </button>

              {/* Twitter/X */}
              <button
                onClick={handleTwitter}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-ink hover:bg-surface-raised transition-colors"
              >
                <Twitter className="h-4 w-4 text-sky-400" />
                Twitter / X
              </button>

              {/* WhatsApp */}
              <button
                onClick={handleWhatsApp}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-ink hover:bg-surface-raised transition-colors"
              >
                <MessageCircle className="h-4 w-4 text-green-500" />
                WhatsApp
              </button>

              {/* Copy link */}
              <button
                onClick={handleCopyLink}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-ink hover:bg-surface-raised transition-colors"
              >
                {copied
                  ? <Check className="h-4 w-4 text-win" />
                  : <Link2 className="h-4 w-4 text-ink-muted" />
                }
                {copied ? 'Copied!' : 'Copy link'}
              </button>

              {/* Instagram note */}
              <div className="mt-1 flex items-start gap-3 rounded-lg px-3 py-2 bg-surface-raised">
                <Instagram className="h-4 w-4 text-ink-subtle mt-0.5 shrink-0" />
                <p className="text-xs text-ink-subtle leading-relaxed">
                  For Instagram, copy the text below and paste in your story:
                </p>
              </div>
              <div className="rounded-lg bg-surface-raised px-3 py-2">
                <p className="text-xs text-ink-muted select-all leading-relaxed">{shareText}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
