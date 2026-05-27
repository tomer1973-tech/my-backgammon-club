'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter }                   from 'next/navigation'
import { Phone, ChevronDown, User, ArrowLeft } from 'lucide-react'
import { createClient }                from '@/lib/supabase/client'
import { Button }                      from '@/components/ui/button'
import { Input }                       from '@/components/ui/input'
import { checkPhoneUserProfile, createPhoneUserProfile } from '@/actions/auth'
import { cn }                          from '@/lib/utils'

// ─────────────────────────────────────────────────────────────────────────────
// Country dial-code data
// ─────────────────────────────────────────────────────────────────────────────

const COUNTRIES = [
  { code: '+1',   flag: '🇺🇸', name: 'United States / Canada' },
  { code: '+7',   flag: '🇷🇺', name: 'Russia / Kazakhstan' },
  { code: '+20',  flag: '🇪🇬', name: 'Egypt' },
  { code: '+27',  flag: '🇿🇦', name: 'South Africa' },
  { code: '+30',  flag: '🇬🇷', name: 'Greece' },
  { code: '+31',  flag: '🇳🇱', name: 'Netherlands' },
  { code: '+32',  flag: '🇧🇪', name: 'Belgium' },
  { code: '+33',  flag: '🇫🇷', name: 'France' },
  { code: '+34',  flag: '🇪🇸', name: 'Spain' },
  { code: '+36',  flag: '🇭🇺', name: 'Hungary' },
  { code: '+39',  flag: '🇮🇹', name: 'Italy' },
  { code: '+40',  flag: '🇷🇴', name: 'Romania' },
  { code: '+41',  flag: '🇨🇭', name: 'Switzerland' },
  { code: '+43',  flag: '🇦🇹', name: 'Austria' },
  { code: '+44',  flag: '🇬🇧', name: 'United Kingdom' },
  { code: '+45',  flag: '🇩🇰', name: 'Denmark' },
  { code: '+46',  flag: '🇸🇪', name: 'Sweden' },
  { code: '+47',  flag: '🇳🇴', name: 'Norway' },
  { code: '+48',  flag: '🇵🇱', name: 'Poland' },
  { code: '+49',  flag: '🇩🇪', name: 'Germany' },
  { code: '+51',  flag: '🇵🇪', name: 'Peru' },
  { code: '+52',  flag: '🇲🇽', name: 'Mexico' },
  { code: '+54',  flag: '🇦🇷', name: 'Argentina' },
  { code: '+55',  flag: '🇧🇷', name: 'Brazil' },
  { code: '+56',  flag: '🇨🇱', name: 'Chile' },
  { code: '+57',  flag: '🇨🇴', name: 'Colombia' },
  { code: '+60',  flag: '🇲🇾', name: 'Malaysia' },
  { code: '+61',  flag: '🇦🇺', name: 'Australia' },
  { code: '+62',  flag: '🇮🇩', name: 'Indonesia' },
  { code: '+63',  flag: '🇵🇭', name: 'Philippines' },
  { code: '+64',  flag: '🇳🇿', name: 'New Zealand' },
  { code: '+65',  flag: '🇸🇬', name: 'Singapore' },
  { code: '+66',  flag: '🇹🇭', name: 'Thailand' },
  { code: '+81',  flag: '🇯🇵', name: 'Japan' },
  { code: '+82',  flag: '🇰🇷', name: 'South Korea' },
  { code: '+84',  flag: '🇻🇳', name: 'Vietnam' },
  { code: '+86',  flag: '🇨🇳', name: 'China' },
  { code: '+90',  flag: '🇹🇷', name: 'Turkey' },
  { code: '+91',  flag: '🇮🇳', name: 'India' },
  { code: '+92',  flag: '🇵🇰', name: 'Pakistan' },
  { code: '+94',  flag: '🇱🇰', name: 'Sri Lanka' },
  { code: '+95',  flag: '🇲🇲', name: 'Myanmar' },
  { code: '+98',  flag: '🇮🇷', name: 'Iran' },
  { code: '+212', flag: '🇲🇦', name: 'Morocco' },
  { code: '+213', flag: '🇩🇿', name: 'Algeria' },
  { code: '+216', flag: '🇹🇳', name: 'Tunisia' },
  { code: '+218', flag: '🇱🇾', name: 'Libya' },
  { code: '+234', flag: '🇳🇬', name: 'Nigeria' },
  { code: '+254', flag: '🇰🇪', name: 'Kenya' },
  { code: '+255', flag: '🇹🇿', name: 'Tanzania' },
  { code: '+256', flag: '🇺🇬', name: 'Uganda' },
  { code: '+263', flag: '🇿🇼', name: 'Zimbabwe' },
  { code: '+351', flag: '🇵🇹', name: 'Portugal' },
  { code: '+353', flag: '🇮🇪', name: 'Ireland' },
  { code: '+354', flag: '🇮🇸', name: 'Iceland' },
  { code: '+358', flag: '🇫🇮', name: 'Finland' },
  { code: '+359', flag: '🇧🇬', name: 'Bulgaria' },
  { code: '+370', flag: '🇱🇹', name: 'Lithuania' },
  { code: '+371', flag: '🇱🇻', name: 'Latvia' },
  { code: '+372', flag: '🇪🇪', name: 'Estonia' },
  { code: '+380', flag: '🇺🇦', name: 'Ukraine' },
  { code: '+385', flag: '🇭🇷', name: 'Croatia' },
  { code: '+420', flag: '🇨🇿', name: 'Czech Republic' },
  { code: '+421', flag: '🇸🇰', name: 'Slovakia' },
  { code: '+961', flag: '🇱🇧', name: 'Lebanon' },
  { code: '+962', flag: '🇯🇴', name: 'Jordan' },
  { code: '+964', flag: '🇮🇶', name: 'Iraq' },
  { code: '+965', flag: '🇰🇼', name: 'Kuwait' },
  { code: '+966', flag: '🇸🇦', name: 'Saudi Arabia' },
  { code: '+971', flag: '🇦🇪', name: 'UAE' },
  { code: '+972', flag: '🇮🇱', name: 'Israel' },
] as const

type CountryEntry = typeof COUNTRIES[number]
type Step = 'phone' | 'otp' | 'name'

// ─────────────────────────────────────────────────────────────────────────────
// Country picker sub-component
// ─────────────────────────────────────────────────────────────────────────────

function CountryPicker({
  value,
  onChange,
}: {
  value: string
  onChange: (code: string) => void
}) {
  const [open,   setOpen]   = useState(false)
  const [search, setSearch] = useState('')
  const wrapperRef = useRef<HTMLDivElement>(null)

  const selected = (COUNTRIES as readonly CountryEntry[]).find(c => c.code === value) ?? COUNTRIES[0]

  const filtered = search.trim()
    ? (COUNTRIES as readonly CountryEntry[]).filter(
        c =>
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          c.code.includes(search),
      )
    : (COUNTRIES as readonly CountryEntry[])

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={cn(
          'flex items-center gap-1.5 h-12 pl-3 pr-2 rounded-l-xl',
          'border border-r-0 border-line bg-surface-elevated',
          'text-sm text-ink transition-colors',
          'hover:bg-surface-base hover:border-line-gold/60',
          'focus:outline-none focus:ring-2 focus:ring-gold/50',
          open && 'border-gold/50 bg-surface-base',
        )}
        aria-label="Select country code"
      >
        <span className="text-lg leading-none">{selected.flag}</span>
        <span className="font-mono text-xs text-ink-muted tabular-nums">{selected.code}</span>
        <ChevronDown className={cn('h-3 w-3 text-ink-subtle transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute z-50 top-full left-0 mt-1 w-72 rounded-xl border border-line bg-surface-raised shadow-xl shadow-black/20 overflow-hidden">
          {/* Search */}
          <div className="p-2 border-b border-line">
            <input
              type="text"
              placeholder="Search country or code…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              autoFocus
              className={cn(
                'w-full rounded-lg bg-surface-base px-3 py-2 text-sm text-ink',
                'placeholder-ink-subtle/50 outline-none',
                'focus:ring-1 focus:ring-gold/50 border border-line focus:border-gold/50',
              )}
            />
          </div>

          {/* List */}
          <div className="max-h-52 overflow-y-auto p-1">
            {filtered.map(country => (
              <button
                key={`${country.code}-${country.name}`}
                type="button"
                onClick={() => {
                  onChange(country.code)
                  setOpen(false)
                  setSearch('')
                }}
                className={cn(
                  'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-left',
                  'hover:bg-surface-elevated transition-colors duration-100',
                  country.code === value && 'bg-gold/10 text-gold font-medium',
                )}
              >
                <span className="text-base leading-none">{country.flag}</span>
                <span className="flex-1 text-ink truncate text-xs">{country.name}</span>
                <span className="font-mono text-xs text-ink-muted">{country.code}</span>
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="px-3 py-4 text-xs text-ink-subtle text-center">No countries found</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main PhoneAuthForm
// ─────────────────────────────────────────────────────────────────────────────

interface PhoneAuthFormProps {
  onBack?: () => void
}

export function PhoneAuthForm({ onBack }: PhoneAuthFormProps) {
  const router = useRouter()

  const [step,        setStep]        = useState<Step>('phone')
  const [countryCode, setCountryCode] = useState('+1')
  const [localNumber, setLocalNumber] = useState('')
  const [otpCode,     setOtpCode]     = useState('')
  const [name,        setName]        = useState('')
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState<string | null>(null)
  const [resendTimer, setResendTimer] = useState(0)

  const fullPhone = `${countryCode}${localNumber.replace(/\D/g, '')}`

  // Countdown for resend button
  useEffect(() => {
    if (resendTimer <= 0) return
    const t = setTimeout(() => setResendTimer(n => n - 1), 1000)
    return () => clearTimeout(t)
  }, [resendTimer])

  // ── Step 1: send OTP ──────────────────────────────────────────────────────

  const handleSendOtp = async () => {
    const digits = localNumber.replace(/\D/g, '')
    if (digits.length < 5) {
      setError('Please enter a valid phone number.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const supabase = createClient()
      const { error: otpError } = await supabase.auth.signInWithOtp({ phone: fullPhone })
      if (otpError) {
        setError(otpError.message)
      } else {
        setStep('otp')
        setResendTimer(60)
      }
    } catch {
      setError('Failed to send code. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    if (resendTimer > 0) return
    setLoading(true)
    setError(null)
    try {
      const supabase = createClient()
      const { error: otpError } = await supabase.auth.signInWithOtp({ phone: fullPhone })
      if (otpError) {
        setError(otpError.message)
      } else {
        setResendTimer(60)
      }
    } catch {
      setError('Failed to resend. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // ── Step 2: verify OTP ────────────────────────────────────────────────────

  const handleVerifyOtp = async () => {
    if (otpCode.replace(/\D/g, '').length !== 6) {
      setError('Please enter the full 6-digit code.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const supabase = createClient()
      const { error: verifyError } = await supabase.auth.verifyOtp({
        phone: fullPhone,
        token: otpCode.replace(/\D/g, ''),
        type:  'sms',
      })
      if (verifyError) {
        setError(
          verifyError.message.includes('expired') || verifyError.message.includes('invalid')
            ? 'Incorrect or expired code. Please try again.'
            : verifyError.message,
        )
        setLoading(false)
        return
      }

      // Check whether a player profile exists
      const check = await checkPhoneUserProfile()
      if (!check.success) {
        setError(check.error)
        setLoading(false)
        return
      }

      if (check.data?.isNew) {
        // New user → collect their name
        setStep('name')
      } else {
        // Existing user → go home
        router.push('/')
        router.refresh()
      }
    } catch {
      setError('Verification failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // ── Step 3: save name for new users ──────────────────────────────────────

  const handleSaveName = async () => {
    const trimmed = name.trim()
    if (trimmed.length < 2) {
      setError('Please enter your name (at least 2 characters).')
      return
    }
    if (trimmed.length > 60) {
      setError('Name must be 60 characters or fewer.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const result = await createPhoneUserProfile(trimmed)
      if (!result.success) {
        setError(result.error)
        setLoading(false)
        return
      }
      router.push('/')
      router.refresh()
    } catch {
      setError('Failed to save. Please try again.')
      setLoading(false)
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Step 1 — Phone number entry */}
      {step === 'phone' && (
        <>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-ink-muted mb-1.5">
              Phone number
            </p>
            <div className="flex">
              <CountryPicker value={countryCode} onChange={setCountryCode} />
              <input
                type="tel"
                inputMode="tel"
                placeholder="Mobile number"
                value={localNumber}
                onChange={e => setLocalNumber(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSendOtp()}
                autoFocus
                autoComplete="tel-national"
                className={cn(
                  'flex-1 h-12 px-3 rounded-r-xl',
                  'border border-line bg-surface-elevated',
                  'text-sm text-ink placeholder-ink-subtle/50',
                  'focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold/50',
                  'transition-colors',
                )}
              />
            </div>
            <p className="mt-1.5 text-xs text-ink-subtle">
              We&apos;ll send a verification code via SMS.
            </p>
          </div>

          {error && (
            <div className="rounded-lg border border-loss/40 bg-loss/10 px-4 py-3 text-sm text-loss">
              {error}
            </div>
          )}

          <Button
            type="button"
            className="w-full"
            size="lg"
            onClick={handleSendOtp}
            isLoading={loading}
            disabled={loading}
          >
            Send Code
          </Button>

          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="w-full flex items-center justify-center gap-1.5 text-sm text-ink-muted hover:text-ink transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Other sign-in options
            </button>
          )}
        </>
      )}

      {/* Step 2 — OTP verification */}
      {step === 'otp' && (
        <>
          <div className="text-center">
            <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gold/10 border border-gold/30">
              <Phone className="h-5 w-5 text-gold" />
            </div>
            <p className="text-sm text-ink font-medium">Check your messages</p>
            <p className="mt-1 text-xs text-ink-muted">
              We sent a 6-digit code to{' '}
              <span className="font-mono font-medium text-ink">{fullPhone}</span>
            </p>
          </div>

          <Input
            name="otp"
            type="text"
            inputMode="numeric"
            label="Verification code"
            placeholder="000000"
            maxLength={6}
            value={otpCode}
            onChange={e => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            onKeyDown={e => e.key === 'Enter' && handleVerifyOtp()}
            autoFocus
            autoComplete="one-time-code"
            hint="Enter the 6-digit code from your SMS"
          />

          {error && (
            <div className="rounded-lg border border-loss/40 bg-loss/10 px-4 py-3 text-sm text-loss">
              {error}
            </div>
          )}

          <Button
            type="button"
            className="w-full"
            size="lg"
            onClick={handleVerifyOtp}
            isLoading={loading}
            disabled={loading || otpCode.length < 6}
          >
            Verify &amp; Sign In
          </Button>

          <div className="flex items-center justify-between text-xs text-ink-subtle">
            <button
              type="button"
              onClick={() => { setStep('phone'); setOtpCode(''); setError(null) }}
              className="flex items-center gap-1 hover:text-ink transition-colors"
            >
              <ArrowLeft className="h-3 w-3" />
              Change number
            </button>

            <button
              type="button"
              onClick={handleResend}
              disabled={resendTimer > 0 || loading}
              className={cn(
                'transition-colors',
                resendTimer > 0 || loading
                  ? 'text-ink-subtle/50 cursor-not-allowed'
                  : 'hover:text-gold',
              )}
            >
              {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend code'}
            </button>
          </div>
        </>
      )}

      {/* Step 3 — Name for new users */}
      {step === 'name' && (
        <>
          <div className="text-center">
            <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gold/10 border border-gold/30">
              <User className="h-5 w-5 text-gold" />
            </div>
            <p className="text-sm text-ink font-medium">Welcome aboard!</p>
            <p className="mt-1 text-xs text-ink-muted">
              Just tell us your name to complete your profile.
            </p>
          </div>

          <Input
            name="name"
            type="text"
            label="Your name"
            placeholder="Avi Cohen"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSaveName()}
            autoFocus
            autoComplete="name"
            leading={<User className="h-4 w-4" />}
            hint="This is how other players will see you"
          />

          {error && (
            <div className="rounded-lg border border-loss/40 bg-loss/10 px-4 py-3 text-sm text-loss">
              {error}
            </div>
          )}

          <Button
            type="button"
            className="w-full"
            size="lg"
            onClick={handleSaveName}
            isLoading={loading}
            disabled={loading || name.trim().length < 2}
          >
            Start Playing
          </Button>
        </>
      )}
    </div>
  )
}
