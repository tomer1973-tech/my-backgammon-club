'use client'

/**
 * AvatarPicker
 *
 * Three tabs:
 *   Photo — upload a photo (resized client-side to 200×200 JPEG, stored as data URL)
 *   Flag  — pick a country flag shown as a glossy 3-D sphere button
 *   Icon  — pick a themed emoji shown as a glossy dark sphere button
 *
 * Saves immediately on flag/icon click; requires "Save" on photo.
 * Stores:  "flag:XX"  for flags  |  emoji char  for icons  |  data URL for photos
 */

import { useRef, useState, useTransition } from 'react'
import { Camera, Flag, Smile, Trash2, Loader2, CheckCircle2, Upload } from 'lucide-react'
import { Avatar, GLOSS_GRADIENT } from '@/components/ui/avatar'
import { Button }                  from '@/components/ui/button'
import { updateAvatar }            from '@/actions/auth'
import { cn }                      from '@/lib/utils'

// ── Data ─────────────────────────────────────────────────────────────────────

const FLAGS: { code: string; name: string }[] = [
  { code: 'us', name: 'United States' }, { code: 'gb', name: 'United Kingdom' },
  { code: 'il', name: 'Israel' },        { code: 'de', name: 'Germany' },
  { code: 'fr', name: 'France' },        { code: 'it', name: 'Italy' },
  { code: 'es', name: 'Spain' },         { code: 'pt', name: 'Portugal' },
  { code: 'ca', name: 'Canada' },        { code: 'au', name: 'Australia' },
  { code: 'br', name: 'Brazil' },        { code: 'jp', name: 'Japan' },
  { code: 'cn', name: 'China' },         { code: 'ru', name: 'Russia' },
  { code: 'nl', name: 'Netherlands' },   { code: 'be', name: 'Belgium' },
  { code: 'ch', name: 'Switzerland' },   { code: 'at', name: 'Austria' },
  { code: 'se', name: 'Sweden' },        { code: 'no', name: 'Norway' },
  { code: 'dk', name: 'Denmark' },       { code: 'fi', name: 'Finland' },
  { code: 'pl', name: 'Poland' },        { code: 'cz', name: 'Czech Republic' },
  { code: 'hu', name: 'Hungary' },       { code: 'ro', name: 'Romania' },
  { code: 'gr', name: 'Greece' },        { code: 'tr', name: 'Turkey' },
  { code: 'ar', name: 'Argentina' },     { code: 'mx', name: 'Mexico' },
  { code: 'co', name: 'Colombia' },      { code: 'za', name: 'South Africa' },
  { code: 'ng', name: 'Nigeria' },       { code: 'kr', name: 'South Korea' },
  { code: 'in', name: 'India' },         { code: 'ir', name: 'Iran' },
  { code: 'sa', name: 'Saudi Arabia' },  { code: 'ph', name: 'Philippines' },
  { code: 'th', name: 'Thailand' },      { code: 'vn', name: 'Vietnam' },
  { code: 'id', name: 'Indonesia' },     { code: 'eg', name: 'Egypt' },
  { code: 'nz', name: 'New Zealand' },   { code: 'sg', name: 'Singapore' },
  { code: 'hk', name: 'Hong Kong' },     { code: 'ua', name: 'Ukraine' },
  { code: 'sk', name: 'Slovakia' },      { code: 'bg', name: 'Bulgaria' },
  { code: 'lv', name: 'Latvia' },        { code: 'lt', name: 'Lithuania' },
]

const ICONS = [
  '🎲','🏆','♟️','🎯','🃏','👑','⚡','🔥','🌟','💎',
  '🦁','🐯','🦊','🦅','🐉','🏅','🥇','🎪','🎭','🎬',
  '🎮','🌙','☀️','🌊','🏔️','🌈','🛡️','⚔️','🎸','🦄',
]

// ── Gloss helper ─────────────────────────────────────────────────────────────

const SHADOW_NORMAL =
  'inset 0 1px 2px rgba(255,255,255,0.55),' +
  'inset 0 -1px 1px rgba(0,0,0,0.22),' +
  '0 0 0 1.5px rgba(215,215,215,0.38),' +
  '0 4px 10px rgba(0,0,0,0.45),' +
  '0 2px 4px rgba(0,0,0,0.25)'

const SHADOW_SELECTED =
  'inset 0 1px 2px rgba(255,255,255,0.55),' +
  'inset 0 -1px 1px rgba(0,0,0,0.22),' +
  '0 0 0 2px rgba(180,140,40,0.90),' +
  '0 0 0 4px rgba(180,140,40,0.35),' +
  '0 4px 12px rgba(0,0,0,0.50)'

// ── Sub-components ────────────────────────────────────────────────────────────

/** Glossy 3-D sphere flag button using a real rectangular flag image. */
function FlagButton({
  flag, selected, onClick, disabled,
}: {
  flag: (typeof FLAGS)[number]
  selected: boolean
  onClick:  () => void
  disabled: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={flag.name}
      className={cn(
        'relative aspect-square rounded-full overflow-hidden',
        'transition-all duration-150',
        'hover:scale-110 active:scale-95',
        selected && 'scale-110',
      )}
      style={{ boxShadow: selected ? SHADOW_SELECTED : SHADOW_NORMAL }}
    >
      {/* Flag image */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`https://flagcdn.com/w80/${flag.code}.png`}
        alt={flag.name}
        className="absolute inset-0 h-full w-full object-cover object-center"
        loading="lazy"
      />
      {/* Gloss sphere overlay */}
      <div
        className="absolute inset-0 rounded-full pointer-events-none"
        style={{ background: GLOSS_GRADIENT }}
      />
    </button>
  )
}

/** Glossy 3-D sphere icon button with a dark gradient background and large emoji. */
function IconButton({
  icon, selected, onClick, disabled,
}: {
  icon:     string
  selected: boolean
  onClick:  () => void
  disabled: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={icon}
      className={cn(
        'relative aspect-square rounded-full overflow-hidden',
        'transition-all duration-150',
        'hover:scale-110 active:scale-95',
        selected && 'scale-110',
      )}
      style={{
        background: 'radial-gradient(ellipse at 40% 30%, hsl(220,20%,30%) 0%, hsl(220,18%,17%) 100%)',
        boxShadow: selected ? SHADOW_SELECTED : SHADOW_NORMAL,
      }}
    >
      {/* Emoji centred */}
      <span className="absolute inset-0 flex items-center justify-center text-2xl leading-none select-none">
        {icon}
      </span>
      {/* Subtle gloss — lighter than flag to not drown the emoji */}
      <div
        className="absolute inset-0 rounded-full pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 60% 45% at 42% 26%,' +
            ' rgba(255,255,255,0.28) 0%,' +
            ' rgba(255,255,255,0.12) 40%,' +
            ' transparent 65%)',
        }}
      />
    </button>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Resize + square-crop a File → JPEG data URL (200 × 200). */
async function resizePhoto(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const side = Math.min(img.width, img.height)
      const sx   = (img.width  - side) / 2
      const sy   = (img.height - side) / 2
      const canvas = document.createElement('canvas')
      canvas.width  = 200
      canvas.height = 200
      const ctx = canvas.getContext('2d')
      if (!ctx) { reject(new Error('canvas')); return }
      ctx.drawImage(img, sx, sy, side, side, 0, 0, 200, 200)
      URL.revokeObjectURL(url)
      resolve(canvas.toDataURL('image/jpeg', 0.82))
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('load')) }
    img.src = url
  })
}

// ── Large ring preview ────────────────────────────────────────────────────────

function PreviewAvatar({ name, src }: { name: string; src?: string | null }) {
  return (
    <Avatar
      name={name}
      src={src}
      size="xl"
      className="border-none"
      style={{
        boxShadow: SHADOW_SELECTED,
      } as React.CSSProperties}
    />
  )
}

// ── Main component ────────────────────────────────────────────────────────────

interface AvatarPickerProps {
  userName:      string
  currentAvatar: string | null | undefined
}

type Tab = 'photo' | 'flag' | 'icon'

export function AvatarPicker({ userName, currentAvatar }: AvatarPickerProps) {
  const fileRef = useRef<HTMLInputElement>(null)

  const [tab, setTab]               = useState<Tab>('photo')
  const [preview, setPreview]       = useState<string | null>(null)
  const [saved, setSaved]           = useState(false)
  const [error, setError]           = useState<string | null>(null)
  const [pending, startTransition]  = useTransition()

  const displayAvatar = preview ?? currentAvatar ?? null

  async function save(value: string | null) {
    setError(null); setSaved(false)
    startTransition(async () => {
      const res = await updateAvatar(value)
      if (res.success) {
        setSaved(true)
        setPreview(null)
        setTimeout(() => setSaved(false), 2500)
      } else {
        setError(res.error ?? 'Something went wrong.')
      }
    })
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)
    try { setPreview(await resizePhoto(file)) }
    catch { setError('Could not load image. Please try another file.') }
    e.target.value = ''
  }

  // Label for current avatar in preview area
  const avatarLabel = !displayAvatar
    ? 'No avatar — showing initials'
    : displayAvatar.startsWith('data:')
    ? 'Custom photo'
    : displayAvatar.startsWith('flag:')
    ? FLAGS.find(f => `flag:${f.code}` === displayAvatar)?.name ?? 'Flag'
    : 'Icon'

  return (
    <div className="space-y-5">

      {/* ── Live preview ──────────────────────────────────────────────────── */}
      <div className="flex items-center gap-5">
        <PreviewAvatar name={userName} src={displayAvatar} />
        <div className="space-y-1">
          <p className="text-sm font-semibold text-ink">{userName}</p>
          <p className="text-xs text-ink-subtle">{avatarLabel}</p>
          {saved && (
            <p className="flex items-center gap-1.5 text-xs font-medium text-win">
              <CheckCircle2 className="h-3.5 w-3.5" /> Saved!
            </p>
          )}
        </div>
      </div>

      {/* ── Tab bar ───────────────────────────────────────────────────────── */}
      <div className="flex rounded-xl border border-line overflow-hidden text-sm font-medium">
        {([
          { id: 'photo' as Tab, label: 'Photo', Icon: Camera },
          { id: 'flag'  as Tab, label: 'Flag',  Icon: Flag   },
          { id: 'icon'  as Tab, label: 'Icon',  Icon: Smile  },
        ] as const).map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => { setTab(id); setPreview(null); setError(null) }}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 py-3 transition-colors',
              tab === id
                ? 'bg-gold text-surface-canvas'
                : 'text-ink-muted hover:text-ink hover:bg-surface-elevated',
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {/* ── Photo tab ─────────────────────────────────────────────────────── */}
      {tab === 'photo' && (
        <div className="space-y-3">
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />

          {!preview && (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className={cn(
                'w-full flex flex-col items-center gap-3 rounded-xl border-2 border-dashed border-line',
                'py-10 text-ink-muted transition-colors',
                'hover:border-gold/50 hover:text-ink hover:bg-surface-elevated',
              )}
            >
              <div className="rounded-full border border-line bg-surface-elevated p-3">
                <Upload className="h-5 w-5" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium">Choose a photo</p>
                <p className="mt-0.5 text-xs text-ink-subtle">Auto-cropped &amp; resized to a square</p>
              </div>
            </button>
          )}

          {preview && (
            <div className="flex flex-col items-center gap-4 py-2">
              <PreviewAvatar name={userName} src={preview} />
              <div className="flex gap-2">
                <Button type="button" size="sm" onClick={() => save(preview)} isLoading={pending} className="gap-1.5 min-w-[110px]">
                  <CheckCircle2 className="h-4 w-4" /> Save photo
                </Button>
                <Button type="button" variant="secondary" size="sm" onClick={() => fileRef.current?.click()} className="gap-1.5">
                  <Camera className="h-4 w-4" /> Choose different
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Flag tab ──────────────────────────────────────────────────────── */}
      {tab === 'flag' && (
        <div className="space-y-3">
          <p className="text-xs text-ink-subtle">Tap your country flag to set it instantly.</p>
          <div className="grid grid-cols-8 gap-2 sm:grid-cols-10">
            {FLAGS.map(flag => (
              <FlagButton
                key={flag.code}
                flag={flag}
                selected={currentAvatar === `flag:${flag.code}`}
                onClick={() => save(`flag:${flag.code}`)}
                disabled={pending}
              />
            ))}
          </div>
          {pending && (
            <p className="flex items-center gap-2 text-xs text-ink-muted">
              <Loader2 className="h-3 w-3 animate-spin" /> Saving…
            </p>
          )}
        </div>
      )}

      {/* ── Icon tab ──────────────────────────────────────────────────────── */}
      {tab === 'icon' && (
        <div className="space-y-3">
          <p className="text-xs text-ink-subtle">Tap an icon to set it instantly.</p>
          <div className="grid grid-cols-8 gap-2 sm:grid-cols-10">
            {ICONS.map(icon => (
              <IconButton
                key={icon}
                icon={icon}
                selected={currentAvatar === icon}
                onClick={() => save(icon)}
                disabled={pending}
              />
            ))}
          </div>
          {pending && (
            <p className="flex items-center gap-2 text-xs text-ink-muted">
              <Loader2 className="h-3 w-3 animate-spin" /> Saving…
            </p>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <p className="rounded-xl border border-loss/40 bg-loss/10 px-3 py-2 text-xs text-loss">{error}</p>
      )}

      {/* Remove avatar */}
      {currentAvatar && !preview && (
        <div className="pt-1 border-t border-line">
          <Button
            type="button" variant="ghost" size="sm"
            className="gap-1.5 text-ink-subtle hover:text-loss"
            onClick={() => save(null)}
            isLoading={pending}
          >
            <Trash2 className="h-3.5 w-3.5" /> Remove avatar
          </Button>
        </div>
      )}
    </div>
  )
}
