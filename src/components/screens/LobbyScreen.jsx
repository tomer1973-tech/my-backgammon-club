import { useState, useEffect } from 'react'
import { subscribeTournamentsByPlayer, createTournament, joinTournament, deleteTournament, addGuestPlayer } from '../../db'
import BottomSheet from '../ui/BottomSheet'

export default function LobbyScreen({ user, onSelectTournament, onLogout }) {
  const [tournaments, setTournaments] = useState([])
  const [showCreate, setShowCreate]   = useState(false)
  const [showJoin,   setShowJoin]     = useState(false)

  // Create form
  const [tName,     setTName]     = useState('')
  const [tLocation, setTLocation] = useState('')
  const [tPoints,   setTPoints]   = useState('1')
  const [tPlayers,  setTPlayers]  = useState([]) // guest names
  const [tPlayerInput, setTPlayerInput] = useState('')

  // Join form
  const [joinCode, setJoinCode] = useState('')

  const [error,       setError]       = useState('')
  const [loading,     setLoading]     = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(null) // tournament to delete

  useEffect(() => {
    const unsub = subscribeTournamentsByPlayer(user.id, setTournaments)
    return unsub
  }, [user.phone])

  const addPlayerToList = () => {
    const name = tPlayerInput.trim()
    if (!name) return
    if (tPlayers.includes(name)) return
    setTPlayers(p => [...p, name])
    setTPlayerInput('')
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!tName.trim()) return setError('Enter a tournament name')
    setLoading(true); setError('')
    try {
      const id = await createTournament(tName.trim(), tLocation.trim(), Number(tPoints) || 1, user)
      // Add any guest players
      await Promise.all(tPlayers.map(name => addGuestPlayer(id, name)))
      setShowCreate(false)
      setTName(''); setTLocation(''); setTPoints('1'); setTPlayers([]); setTPlayerInput('')
    } catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }

  const handleDelete = async () => {
    if (!confirmDelete) return
    setLoading(true)
    try {
      await deleteTournament(confirmDelete.id)
      setConfirmDelete(null)
    } catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }

  const handleJoin = async (e) => {
    e.preventDefault()
    if (joinCode.length < 6) return setError('Enter the 6-letter code')
    setLoading(true); setError('')
    try {
      await joinTournament(joinCode, user)
      setShowJoin(false); setJoinCode('')
    } catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      {/* Header */}
      <div className="bg-slate-800 px-5 pt-12 pb-5 border-b border-slate-700">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-slate-400 text-sm">Welcome back,</p>
            <h1 className="text-white text-2xl font-bold">{user.name}</h1>
          </div>
          <button onClick={onLogout} className="text-slate-500 hover:text-slate-300 text-sm transition-colors">
            Sign out
          </button>
        </div>
      </div>

      <div className="flex-1 px-5 py-6 space-y-4 overflow-y-auto">
        {/* Action buttons */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => { setShowCreate(true); setError('') }}
            className="bg-green-600 hover:bg-green-500 text-white font-semibold py-4 rounded-xl transition-colors text-sm"
          >
            + New Tournament
          </button>
          <button
            onClick={() => { setShowJoin(true); setError('') }}
            className="bg-slate-700 hover:bg-slate-600 text-white font-semibold py-4 rounded-xl transition-colors text-sm"
          >
            Join with Code
          </button>
        </div>

        {/* Tournament list */}
        <div>
          <h2 className="text-slate-400 text-xs font-medium uppercase tracking-wide mb-3">Your Tournaments</h2>
          {tournaments.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <div className="text-4xl mb-3">🎲</div>
              <p className="text-sm">No tournaments yet.<br />Create one or join with a code.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {tournaments.map(t => (
                <div key={t.id} className="bg-slate-800 border border-slate-700 hover:border-green-600 rounded-xl transition-colors flex items-stretch">
                  {/* Main tap area */}
                  <button
                    onClick={() => onSelectTournament(t)}
                    className="flex-1 p-4 text-left"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-white font-semibold">{t.name}</p>
                        {t.location && <p className="text-slate-400 text-sm mt-0.5">{t.location}</p>}
                      </div>
                      <span className="text-slate-500 text-xs bg-slate-700 px-2 py-1 rounded-lg font-mono">{t.code}</span>
                    </div>
                    <p className="text-slate-500 text-xs mt-2">{t.pointsPerWin ?? 1} pt/win</p>
                  </button>
                  {/* Delete button */}
                  <button
                    onClick={(e) => { e.stopPropagation(); setConfirmDelete(t); setError('') }}
                    className="px-4 text-slate-600 hover:text-red-400 border-l border-slate-700 transition-colors"
                    title="Delete tournament"
                  >
                    🗑️
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create sheet */}
      <BottomSheet open={showCreate} onClose={() => setShowCreate(false)} title="New Tournament">
        <form onSubmit={handleCreate} className="p-5 space-y-4">
          <div>
            <label className="text-slate-400 text-xs uppercase tracking-wide">Tournament Name</label>
            <input value={tName} onChange={e => setTName(e.target.value)} placeholder="Friday Night Blitz"
              className="mt-1 w-full bg-slate-700 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-green-500 placeholder-slate-500" />
          </div>
          <div>
            <label className="text-slate-400 text-xs uppercase tracking-wide">Location (optional)</label>
            <input value={tLocation} onChange={e => setTLocation(e.target.value)} placeholder="Tel Aviv"
              className="mt-1 w-full bg-slate-700 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-green-500 placeholder-slate-500" />
          </div>
          <div>
            <label className="text-slate-400 text-xs uppercase tracking-wide">Base Stake (pts per win)</label>
            <div className="flex gap-2 mt-1 mb-2">
              {['1', '2', '5', '10'].map(v => (
                <button key={v} type="button" onClick={() => setTPoints(v)}
                  className={`flex-1 py-2.5 rounded-xl font-semibold text-sm transition-colors ${tPoints === v ? 'bg-green-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}>
                  {v}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-500 text-xs">Custom:</span>
              <input
                type="number"
                min="1"
                max="999"
                value={tPoints}
                onChange={e => setTPoints(e.target.value.replace(/\D/g, '') || '1')}
                className="flex-1 bg-slate-700 text-white rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-green-500 text-center font-semibold"
              />
              <span className="text-slate-500 text-xs">pts</span>
            </div>
          </div>
          {/* Players */}
          <div>
            <label className="text-slate-400 text-xs uppercase tracking-wide">Players</label>
            <div className="flex gap-2 mt-1">
              <input
                type="text"
                value={tPlayerInput}
                onChange={e => setTPlayerInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addPlayerToList() } }}
                placeholder="Type a name and press +"
                className="flex-1 bg-slate-700 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-green-500 placeholder-slate-500"
              />
              <button type="button" onClick={addPlayerToList}
                className="bg-green-600 hover:bg-green-500 text-white font-bold w-12 rounded-xl text-xl transition-colors">
                +
              </button>
            </div>
            {/* You (creator) always included */}
            <div className="flex flex-wrap gap-2 mt-2">
              <span className="flex items-center gap-1 bg-green-900/40 border border-green-700/50 text-green-300 text-xs px-3 py-1.5 rounded-full">
                {user.name} <span className="text-green-600 text-[10px]">you</span>
              </span>
              {tPlayers.map(name => (
                <span key={name} className="flex items-center gap-1.5 bg-slate-700 text-slate-200 text-xs px-3 py-1.5 rounded-full">
                  {name}
                  <button type="button" onClick={() => setTPlayers(p => p.filter(n => n !== name))}
                    className="text-slate-400 hover:text-red-400 leading-none transition-colors">×</button>
                </span>
              ))}
            </div>
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button type="submit" disabled={loading}
            className="w-full bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors">
            {loading ? 'Creating…' : `Create Tournament${tPlayers.length ? ` · ${tPlayers.length + 1} players` : ''}`}
          </button>
        </form>
      </BottomSheet>

      {/* Delete confirmation */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-6">
          <div className="absolute inset-0 bg-black/70" onClick={() => setConfirmDelete(null)} />
          <div className="relative bg-slate-800 border border-slate-700 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="text-white font-bold text-lg mb-1">Delete Tournament?</h3>
            <p className="text-slate-400 text-sm mb-1">
              <span className="text-white font-medium">"{confirmDelete.name}"</span>
            </p>
            <p className="text-red-400 text-sm mb-5">This permanently deletes all games and scores. Cannot be undone.</p>
            {error && <p className="text-red-400 text-sm mb-3">{error}</p>}
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)}
                className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-medium py-3 rounded-xl transition-colors">
                Cancel
              </button>
              <button onClick={handleDelete} disabled={loading}
                className="flex-1 bg-red-700 hover:bg-red-600 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors">
                {loading ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Join sheet */}
      <BottomSheet open={showJoin} onClose={() => setShowJoin(false)} title="Join Tournament">
        <form onSubmit={handleJoin} className="p-5 space-y-4">
          <div>
            <label className="text-slate-400 text-xs uppercase tracking-wide">6-Letter Code</label>
            <input value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase().slice(0, 6))}
              placeholder="ABCDEF" maxLength={6}
              className="mt-1 w-full bg-slate-700 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-green-500 placeholder-slate-500 text-center text-2xl font-mono tracking-widest uppercase" />
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button type="submit" disabled={loading}
            className="w-full bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors">
            {loading ? 'Joining…' : 'Join Tournament'}
          </button>
        </form>
      </BottomSheet>
    </div>
  )
}
