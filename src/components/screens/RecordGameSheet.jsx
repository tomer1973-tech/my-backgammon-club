import { useState } from 'react'
import BottomSheet from '../ui/BottomSheet'
import { recordGame } from '../../db'

const MULTIPLIERS = [
  { value: 1,  label: '×1',  sub: 'No cube' },
  { value: 2,  label: '×2',  sub: 'First double' },
  { value: 4,  label: '×4',  sub: 'Redouble' },
  { value: 8,  label: '×8',  sub: '3rd double' },
  { value: 16, label: '×16', sub: '4th double' },
  { value: 32, label: '×32', sub: '5th double' },
  { value: 64, label: '×64', sub: 'Max cube' },
]

export default function RecordGameSheet({ open, onClose, user, tournament, members }) {
  const [step,       setStep]       = useState(1) // 1: opponent, 2: result, 3: multiplier, 4: notes
  const [opponent,   setOpponent]   = useState(null)
  const [result,     setResult]     = useState(null) // 'win' | 'loss'
  const [multiplier, setMultiplier] = useState(1)
  const [notes,      setNotes]      = useState('')
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState('')

  const myMember  = members.find(m => m.id === user.id)
  const opponents = members.filter(m => m.id !== user.id)
  const points    = tournament.pointsPerWin * multiplier

  const reset = () => {
    setStep(1); setOpponent(null); setResult(null)
    setMultiplier(1); setNotes(''); setError('')
  }

  const handleClose = () => { reset(); onClose() }

  const handleSave = async () => {
    if (!opponent || !result) return
    setLoading(true); setError('')
    try {
      const winner = result === 'win'
        ? { id: user.id,      name: user.name,      rowId: myMember?.rowId }
        : { id: opponent.id,  name: opponent.name,  rowId: opponent.rowId }
      const loser = result === 'win'
        ? { id: opponent.id,  name: opponent.name,  rowId: opponent.rowId }
        : { id: user.id,      name: user.name,      rowId: myMember?.rowId }
      await recordGame({
        tournamentId: tournament.id,
        winner,
        loser,
        multiplier,
        pointsPerWin: tournament.pointsPerWin ?? tournament.points_per_win,
        notes,
        recordedBy: user.id,
      })
      handleClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const stepLabels = ['Opponent', 'Result', 'Multiplier', 'Notes']

  return (
    <BottomSheet open={open} onClose={handleClose} title="Record Game">
      {/* Step indicator */}
      <div className="flex gap-1.5 px-5 pt-4">
        {stepLabels.map((l, i) => (
          <div key={l} className="flex-1">
            <div className={`h-1 rounded-full ${i + 1 <= step ? 'bg-green-500' : 'bg-slate-700'}`} />
            <p className={`text-[9px] mt-1 ${i + 1 === step ? 'text-green-400' : 'text-slate-600'}`}>{l}</p>
          </div>
        ))}
      </div>

      <div className="p-5">
        {/* Step 1: Pick opponent */}
        {step === 1 && (
          <div className="space-y-3">
            <p className="text-white font-medium">Who did you play?</p>
            {opponents.length === 0 ? (
              <p className="text-slate-400 text-sm">No other players in this tournament yet.</p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {opponents.map(opp => (
                  <button key={opp.id ?? opp.rowId}
                    onClick={() => { setOpponent(opp); setStep(2) }}
                    className="bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded-xl p-4 text-left transition-colors">
                    <p className="text-white font-semibold">{opp.name}</p>
                    <p className="text-slate-400 text-xs mt-0.5">{opp.wins}W · {opp.losses}L</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 2: Win or Loss */}
        {step === 2 && opponent && (
          <div className="space-y-4">
            <p className="text-white font-medium">Result vs <span className="text-green-400">{opponent.name}</span>?</p>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => { setResult('win'); setStep(3) }}
                className="bg-green-800/50 hover:bg-green-700/60 border-2 border-green-600 rounded-2xl p-6 text-center transition-colors">
                <div className="text-4xl mb-1">🏆</div>
                <p className="text-green-300 font-bold text-xl">WIN</p>
                <p className="text-green-500 text-xs mt-1">You won</p>
              </button>
              <button onClick={() => { setResult('loss'); setStep(3) }}
                className="bg-red-900/30 hover:bg-red-800/40 border-2 border-red-700 rounded-2xl p-6 text-center transition-colors">
                <div className="text-4xl mb-1">😔</div>
                <p className="text-red-300 font-bold text-xl">LOSS</p>
                <p className="text-red-500 text-xs mt-1">You lost</p>
              </button>
            </div>
            <button onClick={() => setStep(1)} className="text-slate-400 text-sm w-full text-center">← Back</button>
          </div>
        )}

        {/* Step 3: Multiplier */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="flex items-baseline justify-between">
              <p className="text-white font-medium">Doubling Cube</p>
              <p className="text-slate-400 text-xs">base stake: {tournament.pointsPerWin ?? tournament.points_per_win ?? 1} pts</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {MULTIPLIERS.map(m => {
                const pts = (tournament.pointsPerWin ?? tournament.points_per_win ?? 1) * m.value
                return (
                  <button key={m.value}
                    onClick={() => setMultiplier(m.value)}
                    className={`flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-colors ${
                      multiplier === m.value
                        ? 'border-green-500 bg-green-900/30 text-white'
                        : 'border-slate-700 bg-slate-800 text-slate-300 hover:border-slate-500'
                    }`}>
                    <div className="text-left">
                      <p className="font-bold text-base leading-tight">{m.label}</p>
                      <p className="text-[10px] text-slate-400 leading-tight">{m.sub}</p>
                    </div>
                    <span className={`text-sm font-semibold ${multiplier === m.value ? 'text-green-400' : 'text-slate-400'}`}>
                      {pts}pt{pts !== 1 ? 's' : ''}
                    </span>
                  </button>
                )
              })}
              {/* Custom value tile */}
              <button
                onClick={() => {
                  const v = parseInt(prompt('Enter custom multiplier (e.g. 3, 6, 12):') || '1')
                  if (v > 0) setMultiplier(v)
                }}
                className="flex items-center justify-between px-4 py-3 rounded-xl border-2 border-dashed border-slate-600 bg-slate-800 text-slate-400 hover:border-slate-400 transition-colors col-span-1"
              >
                <div className="text-left">
                  <p className="font-bold text-base leading-tight">✎</p>
                  <p className="text-[10px] leading-tight">Custom</p>
                </div>
                {![1,2,4,8,16,32,64].includes(multiplier) && (
                  <span className="text-green-400 text-sm font-semibold">×{multiplier}</span>
                )}
              </button>
            </div>
            <button onClick={() => setStep(4)}
              className="w-full bg-green-600 hover:bg-green-500 text-white font-semibold py-3 rounded-xl transition-colors">
              Next →
            </button>
            <button onClick={() => setStep(2)} className="text-slate-400 text-sm w-full text-center">← Back</button>
          </div>
        )}

        {/* Step 4: Notes + confirm */}
        {step === 4 && (
          <div className="space-y-4">
            <p className="text-white font-medium">Notes (optional)</p>
            <input value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="e.g. Double cube on move 12…"
              className="w-full bg-slate-700 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-green-500 placeholder-slate-500" />

            {/* Summary */}
            <div className={`rounded-xl p-4 border ${result === 'win' ? 'bg-green-900/20 border-green-700/40' : 'bg-red-900/20 border-red-700/40'}`}>
              <p className="text-slate-300 text-sm mb-1">Saving:</p>
              <p className="text-white font-semibold">
                {result === 'win' ? `You beat ${opponent?.name}` : `${opponent?.name} beat you`}
              </p>
              <p className={`text-sm font-medium mt-0.5 ${result === 'win' ? 'text-green-400' : 'text-red-400'}`}>
                {result === 'win' ? '+' : '−'}{points} pts · ×{multiplier}
              </p>
              <p className="text-green-400 text-xs mt-2">✓ Score saved immediately</p>
            </div>

            {error && <p className="text-red-400 text-sm">{error}</p>}

            <button onClick={handleSave} disabled={loading}
              className="w-full bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-bold py-4 rounded-xl transition-colors text-lg">
              {loading ? 'Saving…' : 'Save Game'}
            </button>
            <button onClick={() => setStep(3)} className="text-slate-400 text-sm w-full text-center">← Back</button>
          </div>
        )}
      </div>
    </BottomSheet>
  )
}
