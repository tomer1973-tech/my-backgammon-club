import { calcMemberStats } from '../../utils/stats'

export default function HomeTab({ user, tournament, members, games }) {
  const myMember = members.find(m => m.id === user.id) ?? { points: 0, wins: 0, losses: 0 }
  const stats    = calcMemberStats(games, user.id)
  const sorted   = [...members].sort((a, b) => b.points - a.points)
  const rank     = sorted.findIndex(m => m.id === user.id) + 1

  const confirmed = games.filter(g => g.status !== 'rejected')

  return (
    <div className="space-y-5">
      {/* Score card */}
      <div className="bg-gradient-to-br from-green-900/50 to-slate-800 border border-green-800/40 rounded-2xl p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-green-400 text-xs font-medium uppercase tracking-wide">Your Position</p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-white text-4xl font-bold">#{rank || '—'}</span>
              <span className="text-slate-400 text-sm">of {members.length}</span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-slate-400 text-xs">Total Points</p>
            <p className={`text-2xl font-bold ${(myMember.points ?? 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {(myMember.points ?? 0) > 0 ? '+' : ''}{myMember.points ?? 0}
            </p>
          </div>
        </div>

        <div className="flex gap-4 mt-4 pt-4 border-t border-slate-700/50">
          <div className="text-center">
            <p className="text-white font-bold text-xl">{myMember.wins ?? 0}</p>
            <p className="text-slate-400 text-xs">Wins</p>
          </div>
          <div className="text-center">
            <p className="text-white font-bold text-xl">{myMember.losses ?? 0}</p>
            <p className="text-slate-400 text-xs">Losses</p>
          </div>
          <div className="text-center">
            <p className="text-white font-bold text-xl">{stats.winRate}%</p>
            <p className="text-slate-400 text-xs">Win Rate</p>
          </div>
          {stats.streak.current > 1 && (
            <div className="text-center">
              <p className={`font-bold text-xl ${stats.streak.type ? 'text-green-400' : 'text-red-400'}`}>
                {stats.streak.current}{stats.streak.type ? 'W' : 'L'}
              </p>
              <p className="text-slate-400 text-xs">Streak</p>
            </div>
          )}
        </div>
      </div>

      {/* Game history */}
      {confirmed.length === 0 ? (
        <div className="text-center py-10 text-slate-500">
          <p className="text-3xl mb-2">🎲</p>
          <p className="text-sm">No games yet. Tap + to record the first game.</p>
        </div>
      ) : (
        <div>
          <p className="text-slate-400 text-xs font-medium uppercase tracking-wide mb-2">Game History</p>
          <div className="space-y-2">
            {confirmed.map(g => {
              const isMyGame = g.winnerId === user.id || g.loserId === user.id
              const iWon     = g.winnerId === user.id

              if (isMyGame) {
                return (
                  <div key={g.id}
                    className={`bg-slate-800 border rounded-xl p-3 flex items-center justify-between border-l-4 ${
                      iWon ? 'border-l-green-500 border-slate-700' : 'border-l-red-500 border-slate-700'
                    }`}>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-semibold ${iWon ? 'text-green-400' : 'text-red-400'}`}>
                          {iWon ? 'WIN' : 'LOSS'}
                        </span>
                        <span className="text-slate-300 text-sm">vs {iWon ? g.loserName : g.winnerName}</span>
                        {g.multiplier > 1 && <span className="text-amber-400 text-xs">×{g.multiplier}</span>}
                      </div>
                      {g.notes && <p className="text-slate-500 text-xs mt-0.5 truncate">{g.notes}</p>}
                    </div>
                    <span className={`font-semibold flex-shrink-0 ml-3 ${iWon ? 'text-green-400' : 'text-red-400'}`}>
                      {iWon ? '+' : '−'}{g.points}
                    </span>
                  </div>
                )
              }

              return (
                <div key={g.id} className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3 flex items-center justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-green-400 text-xs font-medium">{g.winnerName}</span>
                      <span className="text-slate-500 text-xs">beat</span>
                      <span className="text-red-400 text-xs font-medium">{g.loserName}</span>
                      {g.multiplier > 1 && <span className="text-amber-400 text-xs">×{g.multiplier}</span>}
                    </div>
                    {g.notes && <p className="text-slate-600 text-xs mt-0.5 truncate">{g.notes}</p>}
                  </div>
                  <span className="text-slate-400 text-xs flex-shrink-0 ml-3">+{g.points}pts</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
