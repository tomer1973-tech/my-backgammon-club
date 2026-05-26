import { calcMemberStats, bestAndToughest } from '../../utils/stats'

export default function AnalyticsTab({ user, members, games }) {
  const stats = calcMemberStats(games, user.id)
  const { best, toughest } = bestAndToughest(games, user.id)

  const grid = [
    { label: 'Games Played',     value: stats.totalGames },
    { label: 'Win Rate',         value: `${stats.winRate}%` },
    { label: 'Net Points',       value: stats.netPoints > 0 ? `+${stats.netPoints}` : stats.netPoints, color: stats.netPoints >= 0 ? 'text-green-400' : 'text-red-400' },
    { label: 'Points Won',       value: `+${stats.pointsWon}`,  color: 'text-green-400' },
    { label: 'Points Lost',      value: `−${stats.pointsLost}`, color: 'text-red-400' },
    { label: 'Avg Multiplier',   value: `×${stats.avgMultiplier}` },
    { label: 'Gammons',          value: stats.gammons },
    { label: 'Backgammons',      value: stats.backgammons },
    { label: 'Best Streak',      value: stats.streak.best > 0 ? `${stats.streak.best}${stats.streak.type ? 'W' : 'L'}` : '—' },
  ]

  return (
    <div className="space-y-5">
      {/* Win rate bar */}
      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-4">
        <div className="flex justify-between items-baseline mb-2">
          <p className="text-slate-400 text-xs uppercase tracking-wide">Win Rate</p>
          <p className="text-white font-bold text-lg">{stats.winRate}%</p>
        </div>
        <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-green-600 to-green-400 rounded-full transition-all"
            style={{ width: `${stats.winRate}%` }}
          />
        </div>
        <div className="flex justify-between text-xs mt-1.5 text-slate-500">
          <span>{stats.wins} wins</span>
          <span>{stats.losses} losses</span>
        </div>
      </div>

      {/* Stat grid */}
      <div>
        <p className="text-slate-400 text-xs font-medium uppercase tracking-wide mb-3">All Stats</p>
        <div className="grid grid-cols-3 gap-2">
          {grid.map(s => (
            <div key={s.label} className="bg-slate-800 border border-slate-700 rounded-xl p-3 text-center">
              <p className={`font-bold text-lg ${s.color ?? 'text-white'}`}>{s.value}</p>
              <p className="text-slate-500 text-[10px] mt-0.5 leading-tight">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Best / Toughest */}
      {(best || toughest) && (
        <div className="grid grid-cols-2 gap-3">
          {best && (
            <div className="bg-green-900/20 border border-green-800/40 rounded-xl p-4">
              <p className="text-green-400 text-xs uppercase tracking-wide mb-1">Best vs</p>
              <p className="text-white font-semibold">{best.name}</p>
              <p className="text-green-300 text-sm">{best.wins}W · {best.losses}L</p>
            </div>
          )}
          {toughest && toughest.phone !== best?.phone && (
            <div className="bg-red-900/20 border border-red-800/40 rounded-xl p-4">
              <p className="text-red-400 text-xs uppercase tracking-wide mb-1">Toughest</p>
              <p className="text-white font-semibold">{toughest.name}</p>
              <p className="text-red-300 text-sm">{toughest.wins}W · {toughest.losses}L</p>
            </div>
          )}
        </div>
      )}

      {/* Streak card */}
      {stats.streak.current > 1 && (
        <div className={`rounded-xl p-4 border ${stats.streak.type ? 'bg-green-900/20 border-green-700/40' : 'bg-red-900/20 border-red-700/40'}`}>
          <p className="text-slate-400 text-xs uppercase tracking-wide mb-1">Current Streak</p>
          <p className={`font-bold text-2xl ${stats.streak.type ? 'text-green-400' : 'text-red-400'}`}>
            {stats.streak.current} {stats.streak.type ? 'wins in a row' : 'losses in a row'}
          </p>
          {stats.streak.best > stats.streak.current && (
            <p className="text-slate-500 text-xs mt-1">Best ever: {stats.streak.best}</p>
          )}
        </div>
      )}
    </div>
  )
}
