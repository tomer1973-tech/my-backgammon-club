import { useState } from 'react'
import { registerPlayer, loginPlayer } from '../../db'
import { isLocalMode, enableLocalMode, disableLocalMode } from '../../db'

export default function AuthScreen({ onLogin }) {
  const [localMode, setLocalMode] = useState(isLocalMode)
  const [mode, setMode]       = useState('login') // 'login' | 'register'
  const [phone, setPhone]     = useState('')
  const [name, setName]       = useState('')
  const [pin, setPin]         = useState('')
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)

  const formatPhone = (v) => {
    const digits = v.replace(/\D/g, '').slice(0, 10)
    if (digits.length <= 3) return digits
    if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`
  }

  const switchToLocal = () => {
    enableLocalMode()
    setLocalMode(true)
    setError('')
  }

  const switchToCloud = () => {
    disableLocalMode()
    setLocalMode(false)
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    const rawPhone = phone.replace(/\D/g, '')
    if (rawPhone.length < 7) return setError('Enter a valid phone number')
    if (!localMode && pin.length !== 4) return setError('PIN must be 4 digits')

    setLoading(true)
    try {
      let user
      if (mode === 'register') {
        if (!name.trim()) { setLoading(false); return setError('Enter your name') }
        user = await registerPlayer(rawPhone, name.trim(), pin || '0000')
      } else {
        user = await loginPlayer(rawPhone, pin || '0000')
      }
      onLogin(user)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center px-6">
      {/* Logo */}
      <div className="mb-8 text-center">
        <div className="text-6xl mb-3">🎲</div>
        <h1 className="text-white text-3xl font-bold tracking-tight">My Backgammon Club</h1>
        <p className="text-slate-400 mt-1 text-sm">Track games. Own your stats.</p>
      </div>

      {/* Local mode banner */}
      {localMode && (
        <div className="w-full max-w-sm mb-3 bg-amber-900/30 border border-amber-700/50 rounded-xl px-4 py-2.5 flex items-center justify-between">
          <span className="text-amber-300 text-xs font-medium">Playing locally — data saved on this device</span>
          <button onClick={switchToCloud} className="text-amber-500 hover:text-amber-300 text-xs underline transition-colors ml-3 flex-shrink-0">
            Use cloud
          </button>
        </div>
      )}

      {/* Card */}
      <div className="w-full max-w-sm bg-slate-800 rounded-2xl p-6 shadow-xl">
        {/* Toggle */}
        <div className="flex rounded-xl bg-slate-700 p-1 mb-6">
          {['login', 'register'].map(m => (
            <button
              key={m}
              onClick={() => { setMode(m); setError('') }}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                mode === m ? 'bg-green-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              {m === 'login' ? 'Sign In' : 'New Player'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <div>
              <label className="text-slate-400 text-xs font-medium uppercase tracking-wide">Your Name</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Moshe"
                className="mt-1 w-full bg-slate-700 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-green-500 placeholder-slate-500"
              />
            </div>
          )}

          <div>
            <label className="text-slate-400 text-xs font-medium uppercase tracking-wide">Phone Number</label>
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(formatPhone(e.target.value))}
              placeholder="050-123-4567"
              className="mt-1 w-full bg-slate-700 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-green-500 placeholder-slate-500"
            />
          </div>

          {!localMode && (
            <div>
              <label className="text-slate-400 text-xs font-medium uppercase tracking-wide">4-Digit PIN</label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={pin}
                onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="••••"
                className="mt-1 w-full bg-slate-700 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-green-500 placeholder-slate-500 text-center text-2xl tracking-widest"
              />
            </div>
          )}

          {error && (
            <div className="bg-red-900/30 border border-red-700 text-red-300 rounded-xl px-4 py-3 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors text-base"
          >
            {loading ? 'Please wait…' : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>
      </div>

      {/* Play locally option */}
      {!localMode && (
        <div className="mt-5 text-center">
          <p className="text-slate-500 text-xs mb-2">No internet? No account needed.</p>
          <button
            onClick={switchToLocal}
            className="text-slate-400 hover:text-white text-sm font-medium underline transition-colors"
          >
            Play Locally (offline)
          </button>
        </div>
      )}
    </div>
  )
}
