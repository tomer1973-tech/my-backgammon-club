const TABS = [
  { id: 'home',      label: 'Home',       icon: '🏠' },
  { id: 'standings', label: 'Standings',  icon: '🏆' },
  { id: 'h2h',       label: 'Head-to-Head', icon: '⚔️' },
  { id: 'stats',     label: 'Stats',      icon: '📊' },
]

export default function BottomNav({ active, onChange }) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-slate-800 border-t border-slate-700 flex safe-bottom z-40">
      {TABS.map(t => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={`flex-1 flex flex-col items-center py-2 pt-3 transition-colors ${
            active === t.id ? 'text-green-400' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <span className="text-xl">{t.icon}</span>
          <span className="text-[10px] mt-0.5 font-medium">{t.label}</span>
        </button>
      ))}
    </nav>
  )
}
