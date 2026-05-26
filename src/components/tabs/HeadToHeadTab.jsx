import { calcHeadToHead } from '../../utils/stats'

export default function HeadToHeadTab({ user, members, games }) {
  const opponents = members.filter(m => m.id !== user.id)

  if (!opponents.length) {
    return (
      <div className="text-center py-12 text-slate-500">
        <div className="text-4xl mb-3">⚔️</div>
        <p className="text-sm">No opponents yet. Record a game first.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-slate-400 text-xs font-medium uppercase tracking-wide">Your Record vs Each Player</p>
      {opponents.map(opp => {
        const h2h  = calcHeadToHead(games, user.id, opp.id)
        const rate = h2h.total > 0 ? Math.round((h2h.wins / h2h.total) * 100) : 0
        const barW = h2h.total > 0 ? (h2h.wins / h2h.total) * 100 : 50

        return (
          <div key={opp.phone} className="bg-slate-800 border border-slate-700 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-white font-semibold">{opp.name}</p>
              <p className={`text-sm font-medium ${h2h.net > 0 ? 'text-green-400' : h2h.net < 0 ? 'text-red-400' : 'text-slate-400'}`}>
                {h2h.net > 0 ? '+' : ''}{h2h.net} pts
              </p>
            </div>

            {h2h.total === 0 ? (
              <p className="text-slate-500 text-sm">No games yet</p>
            ) : (
              <>
                {/* Win bar */}
                <div className="relative h-2 bg-slate-700 rounded-full overflow-hidden mb-2">
                  <div className="absolute left-0 top-0 h-full bg-green-500 rounded-full transition-all" style={{ width: `${barW}%` }} />
                </div>

                <div className="flex justify-between text-xs">
                  <span className="text-green-400 font-semibold">{h2h.wins}W · {rate}%</span>
                  <span className="text-slate-400">{h2h.total} games</span>
                  <span className="text-red-400 font-semibold">{h2h.losses}L · {100 - rate}%</span>
                </div>
              </>
            )}
          </div>
        )
      })}
    </div>
  )
}
