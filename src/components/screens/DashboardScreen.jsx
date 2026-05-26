import { useState, useEffect } from 'react'
import { subscribeMembers, subscribeGames, addPlayerByPhone, addGuestPlayer } from '../../db'
import BottomNav from '../layout/BottomNav'
import BottomSheet from '../ui/BottomSheet'
import HomeTab from '../tabs/HomeTab'
import StandingsTab from '../tabs/StandingsTab'
import HeadToHeadTab from '../tabs/HeadToHeadTab'
import AnalyticsTab from '../tabs/AnalyticsTab'
import RecordGameSheet from './RecordGameSheet'

export default function DashboardScreen({ user, tournament, onBack }) {
  const [tab,          setTab]          = useState('home')
  const [members,      setMembers]      = useState([])
  const [games,        setGames]        = useState([])
  const [showRecord,   setShowRecord]   = useState(false)
  const [showAddPlayer, setShowAddPlayer] = useState(false)

  // Add-player form state
  const [addMode,    setAddMode]    = useState('phone') // 'phone' | 'guest'
  const [addPhone,   setAddPhone]   = useState('')
  const [addName,    setAddName]    = useState('')
  const [addLoading, setAddLoading] = useState(false)
  const [addError,   setAddError]   = useState('')
  const [addSuccess, setAddSuccess] = useState('')

  useEffect(() => {
    const u1 = subscribeMembers(tournament.id, setMembers)
    const u2 = subscribeGames(tournament.id, setGames)
    return () => { u1(); u2() }
  }, [tournament.id])

  const pendingCount = games.filter(
    g => g.status === 'pending' && g.loserId === user.id && g.recordedBy !== user.id
  ).length

  const formatPhone = (v) => {
    const d = v.replace(/\D/g, '').slice(0, 10)
    if (d.length <= 3) return d
    if (d.length <= 6) return `${d.slice(0, 3)}-${d.slice(3)}`
    return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`
  }

  const handleAddPlayer = async (e) => {
    e.preventDefault()
    setAddLoading(true); setAddError(''); setAddSuccess('')
    try {
      if (addMode === 'phone') {
        const player = await addPlayerByPhone(tournament.id, addPhone)
        setAddSuccess(`${player.name} added!`)
        setAddPhone('')
      } else {
        await addGuestPlayer(tournament.id, addName)
        setAddSuccess(`${addName.trim()} added as guest!`)
        setAddName('')
      }
    } catch (err) {
      setAddError(err.message)
    } finally {
      setAddLoading(false)
    }
  }

  const openAddPlayer = () => {
    setAddMode('phone'); setAddPhone(''); setAddName('')
    setAddError(''); setAddSuccess(''); setShowAddPlayer(true)
  }

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      {/* Header */}
      <div className="bg-slate-800 px-5 pt-12 pb-4 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="text-slate-400 hover:text-white text-xl transition-colors">←</button>
          <div className="flex-1 min-w-0">
            <h1 className="text-white font-bold text-lg truncate">{tournament.name}</h1>
            <p className="text-slate-400 text-xs">{tournament.location || ''} · Code: <span className="font-mono text-green-400">{tournament.code}</span></p>
          </div>
          <div className="flex items-center gap-2">
            {/* Add player button */}
            <button
              onClick={openAddPlayer}
              className="bg-slate-700 hover:bg-slate-600 text-white w-10 h-10 rounded-full text-sm font-bold transition-colors flex items-center justify-center"
              title="Add player"
            >
              👤
            </button>
            {/* Record game button */}
            <div className="relative">
              <button
                onClick={() => setShowRecord(true)}
                className="bg-green-600 hover:bg-green-500 text-white font-bold w-10 h-10 rounded-full text-xl leading-none transition-colors flex items-center justify-center"
              >
                +
              </button>
              {pendingCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-amber-500 text-black text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                  {pendingCount}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto px-4 py-5 pb-24">
        {tab === 'home'      && <HomeTab      user={user} tournament={tournament} members={members} games={games} />}
        {tab === 'standings' && <StandingsTab user={user} members={members} onAddPlayer={openAddPlayer} />}
        {tab === 'h2h'       && <HeadToHeadTab user={user} members={members} games={games} />}
        {tab === 'stats'     && <AnalyticsTab  user={user} members={members} games={games} />}
      </div>

      <BottomNav active={tab} onChange={setTab} />

      <RecordGameSheet
        open={showRecord}
        onClose={() => setShowRecord(false)}
        user={user}
        tournament={tournament}
        members={members}
      />

      {/* Add Player sheet */}
      <BottomSheet open={showAddPlayer} onClose={() => setShowAddPlayer(false)} title="Add Player">
        <div className="p-5 space-y-4">
          {/* Mode toggle */}
          <div className="flex rounded-xl bg-slate-700 p-1">
            {[['phone', '📱 By Phone'], ['guest', '👤 Guest Name']].map(([m, label]) => (
              <button key={m} type="button" onClick={() => { setAddMode(m); setAddError(''); setAddSuccess('') }}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${addMode === m ? 'bg-green-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}>
                {label}
              </button>
            ))}
          </div>

          <form onSubmit={handleAddPlayer} className="space-y-3">
            {addMode === 'phone' ? (
              <div>
                <label className="text-slate-400 text-xs uppercase tracking-wide">Player's Phone Number</label>
                <input
                  type="tel"
                  value={addPhone}
                  onChange={e => setAddPhone(formatPhone(e.target.value))}
                  placeholder="050-123-4567"
                  className="mt-1 w-full bg-slate-700 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-green-500 placeholder-slate-500"
                />
                <p className="text-slate-500 text-xs mt-1">The player must have already registered in the app.</p>
              </div>
            ) : (
              <div>
                <label className="text-slate-400 text-xs uppercase tracking-wide">Player's Name</label>
                <input
                  type="text"
                  value={addName}
                  onChange={e => setAddName(e.target.value)}
                  placeholder="e.g. Avi"
                  className="mt-1 w-full bg-slate-700 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-green-500 placeholder-slate-500"
                />
                <p className="text-slate-500 text-xs mt-1">Guest players don't need an account. Their stats are tracked here.</p>
              </div>
            )}

            {addError   && <p className="text-red-400 text-sm">{addError}</p>}
            {addSuccess && <p className="text-green-400 text-sm font-medium">✓ {addSuccess}</p>}

            <button type="submit" disabled={addLoading}
              className="w-full bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors">
              {addLoading ? 'Adding…' : 'Add Player'}
            </button>
          </form>

          {/* Current members */}
          {members.length > 0 && (
            <div className="pt-2 border-t border-slate-700">
              <p className="text-slate-400 text-xs uppercase tracking-wide mb-2">Current Players ({members.length})</p>
              <div className="flex flex-wrap gap-2">
                {members.map(m => (
                  <span key={m.id ?? m.player_id} className="bg-slate-700 text-slate-300 text-xs px-3 py-1.5 rounded-full">
                    {m.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </BottomSheet>
    </div>
  )
}
