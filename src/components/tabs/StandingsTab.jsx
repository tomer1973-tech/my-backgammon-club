import { useState } from 'react'
import { updateMemberStats } from '../../db'

export default function StandingsTab({ user, members, onAddPlayer }) {
  const sorted = [...members].sort((a, b) => b.points - a.points)

  const [editing,  setEditing]  = useState(null) // member being edited
  const [ePoints,  setEPoints]  = useState('')
  const [eWins,    setEWins]    = useState('')
  const [eLosses,  setELosses]  = useState('')
  const [eSaving,  setESaving]  = useState(false)
  const [eError,   setEError]   = useState('')

  const openEdit = (m) => {
    setEditing(m)
    setEPoints(String(m.points ?? 0))
    setEWins(String(m.wins ?? 0))
    setELosses(String(m.losses ?? 0))
    setEError('')
  }

  const saveEdit = async () => {
    if (!editing) return
    setESaving(true); setEError('')
    try {
      await updateMemberStats(editing.rowId, {
        points:  ePoints,
        wins:    eWins,
        losses:  eLosses,
      })
      setEditing(null)
    } catch (err) {
      setEError(err.message)
    } finally {
      setESaving(false)
    }
  }

  const medals = ['🥇', '🥈', '🥉']

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-slate-400 text-xs font-medium uppercase tracking-wide">Leaderboard</p>
        {onAddPlayer && (
          <button onClick={onAddPlayer}
            className="flex items-center gap-1.5 text-green-400 hover:text-green-300 text-xs font-medium transition-colors">
            <span className="text-base leading-none">+</span> Add Player
          </button>
        )}
      </div>

      <div className="space-y-2">
        {sorted.map((m, i) => {
          const isMe    = m.id === user.id
          const total   = (m.wins ?? 0) + (m.losses ?? 0)
          const rate    = total > 0 ? Math.round(((m.wins ?? 0) / total) * 100) : 0
          const leader  = sorted[0]?.points ?? 0
          const gap     = leader - (m.points ?? 0)

          return (
            <div key={m.id ?? i}
              className={`flex items-center gap-3 p-4 rounded-xl border ${
                isMe ? 'bg-green-900/20 border-green-700/50' : 'bg-slate-800 border-slate-700'
              }`}>
              {/* Rank */}
              <div className="w-7 text-center flex-shrink-0">
                {i < 3
                  ? <span className="text-xl">{medals[i]}</span>
                  : <span className="text-slate-500 font-bold text-sm">#{i + 1}</span>}
              </div>

              {/* Name + record */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className={`font-semibold truncate ${isMe ? 'text-green-300' : 'text-white'}`}>
                    {m.name}
                  </p>
                  {m.isGuest && <span className="text-[9px] text-slate-500 bg-slate-700 px-1.5 py-0.5 rounded">guest</span>}
                  {isMe && <span className="text-[9px] text-green-600">you</span>}
                </div>
                <p className="text-slate-400 text-xs">
                  {m.wins ?? 0}W · {m.losses ?? 0}L · {rate}%
                </p>
              </div>

              {/* Points + edit */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <div className="text-right">
                  <p className={`font-bold text-lg leading-tight ${(m.points ?? 0) >= 0 ? 'text-white' : 'text-red-400'}`}>
                    {(m.points ?? 0) > 0 ? '+' : ''}{m.points ?? 0}
                  </p>
                  {i > 0 && gap > 0 && (
                    <p className="text-slate-500 text-[10px]">−{gap} to #1</p>
                  )}
                </div>
                <button
                  onClick={() => openEdit(m)}
                  className="text-slate-600 hover:text-slate-300 transition-colors p-1"
                  title="Edit score"
                >
                  ✏️
                </button>
              </div>
            </div>
          )
        })}

        {sorted.length === 0 && (
          <div className="text-center py-10 text-slate-500 text-sm">
            No players yet. Tap "+ Add Player" above.
          </div>
        )}
      </div>

      {/* Edit score modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-5">
          <div className="absolute inset-0 bg-black/70" onClick={() => setEditing(null)} />
          <div className="relative bg-slate-800 border border-slate-700 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="text-white font-bold text-lg mb-1">Edit Score</h3>
            <p className="text-slate-400 text-sm mb-4">{editing.name}</p>

            <div className="space-y-3">
              {[
                { label: 'Points', value: ePoints, set: setEPoints, hint: 'Can be negative' },
                { label: 'Wins',   value: eWins,   set: setEWins,   hint: '' },
                { label: 'Losses', value: eLosses, set: setELosses, hint: '' },
              ].map(({ label, value, set, hint }) => (
                <div key={label}>
                  <label className="text-slate-400 text-xs uppercase tracking-wide">{label}</label>
                  <input
                    type="number"
                    value={value}
                    onChange={e => set(e.target.value)}
                    className="mt-1 w-full bg-slate-700 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-green-500 text-center font-semibold text-lg"
                  />
                  {hint && <p className="text-slate-600 text-xs mt-0.5">{hint}</p>}
                </div>
              ))}
            </div>

            {eError && <p className="text-red-400 text-sm mt-3">{eError}</p>}

            <div className="flex gap-3 mt-5">
              <button onClick={() => setEditing(null)}
                className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-medium py-3 rounded-xl transition-colors">
                Cancel
              </button>
              <button onClick={saveEdit} disabled={eSaving}
                className="flex-1 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors">
                {eSaving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
