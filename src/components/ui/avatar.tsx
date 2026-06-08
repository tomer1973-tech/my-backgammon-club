import * as React from 'react'
import { cn }     from '@/lib/utils'

interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  name:  string
  src?:  string | null
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

const sizeMap = {
  sm: { outer: 'h-7 w-7',   text: 'text-[11px]', emoji: 'text-[22px]', flagW: 40  },
  md: { outer: 'h-9 w-9',   text: 'text-xs',     emoji: 'text-[28px]', flagW: 40  },
  lg: { outer: 'h-12 w-12', text: 'text-sm',     emoji: 'text-[38px]', flagW: 80  },
  xl: { outer: 'h-20 w-20', text: 'text-xl',     emoji: 'text-[62px]', flagW: 160 },
}

/** CSS gradient that creates the 3-D gloss sphere illusion */
const GLOSS_GRADIENT =
  'radial-gradient(ellipse 65% 45% at 45% 30%,' +
  ' rgba(255,255,255,0.72) 0%,' +
  ' rgba(255,255,255,0.40) 25%,' +
  ' rgba(255,255,255,0.10) 55%,' +
  ' transparent 70%),' +
  'radial-gradient(ellipse 90% 90% at center,' +
  ' transparent 60%,' +
  ' rgba(0,0,0,0.12) 80%,' +
  ' rgba(0,0,0,0.28) 100%)'

/** True for single emoji / icon (not a URL, data URL, or flag code). */
function looksLikeEmoji(str: string): boolean {
  return (
    !str.startsWith('flag:') &&
    str.length <= 8 &&
    !str.startsWith('http') &&
    !str.startsWith('data:') &&
    !str.startsWith('/')
  )
}

/**
 * Circle avatar with a thin smooth frame.
 *
 * src formats:
 *   null / undefined  → deterministic-colour initials
 *   "flag:XX"         → flag image from flagcdn.com with gloss overlay
 *   "data:…" / "http" → photo fills the circle
 *   short emoji       → large emoji centred in the circle
 */
function Avatar({ name, src, size = 'md', className, ...props }: AvatarProps) {
  const s = sizeMap[size]

  const initials = name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
  const hue      = (name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % 60) + 20

  const isFlagCode = src?.startsWith('flag:') ?? false
  const flagCode   = isFlagCode ? src!.slice(5) : null
  const isEmoji    = src ? looksLikeEmoji(src) : false
  const isImage    = src && !isFlagCode && !isEmoji

  return (
    <div
      className={cn(
        'relative inline-flex flex-shrink-0 items-center justify-center',
        'rounded-full select-none overflow-hidden',
        'border-[1.5px] border-white/20',
        s.outer,
        className,
      )}
      style={isImage || isFlagCode ? undefined : { backgroundColor: `hsl(${hue}, 52%, 42%)` }}
      aria-label={name}
      {...props}
    >
      {/* ── Real photo ───────────────────────────────────────────────────── */}
      {isImage && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src!}
          alt={name}
          className="absolute inset-0 h-full w-full object-cover object-center"
        />
      )}

      {/* ── Flag image + gloss ───────────────────────────────────────────── */}
      {flagCode && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`https://flagcdn.com/w${s.flagW}/${flagCode}.png`}
            alt={name}
            className="absolute inset-0 h-full w-full object-cover object-center"
          />
          <div
            className="absolute inset-0 rounded-full pointer-events-none"
            style={{ background: GLOSS_GRADIENT }}
          />
        </>
      )}

      {/* ── Emoji icon ───────────────────────────────────────────────────── */}
      {isEmoji && (
        <span className={cn('leading-none select-none', s.emoji)} style={{ lineHeight: 1 }}>
          {src}
        </span>
      )}

      {/* ── Initials fallback ────────────────────────────────────────────── */}
      {!src && (
        <span className={cn('font-semibold text-white', s.text)}>{initials}</span>
      )}
    </div>
  )
}

export { Avatar, GLOSS_GRADIENT }
