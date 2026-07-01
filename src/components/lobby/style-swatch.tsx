'use client'

interface StyleSwatchProps {
  slug:      string
  name:      string
  sub:       string
  base:      string
  raised:    string
  line:      string
  accent:    string
  accentInk: string
  ink:       string
  inkSubtle: string
  felt:      string
  feltDark:  number
  glossy:    boolean
}

export function StyleSwatch(p: StyleSwatchProps) {
  function useThisStyle() {
    localStorage.setItem('pb_skin', p.slug)
    document.documentElement.setAttribute('data-skin', p.slug)
  }

  return (
    <div className="overflow-hidden rounded-2xl" style={{ background: p.base, border: `1px solid ${p.line}` }}>
      <div className="flex items-center justify-between px-5 pt-4">
        <div>
          <p className="text-base font-bold" style={{ color: p.ink }}>{p.name}</p>
          <p className="text-xs" style={{ color: p.inkSubtle }}>{p.sub}</p>
        </div>
        <button
          onClick={useThisStyle}
          className="shrink-0 rounded-full px-3 py-1.5 text-xs font-bold"
          style={{ background: p.accent, color: p.accentInk }}
        >
          Use this style
        </button>
      </div>

      <div className="p-5">
        <div className="relative overflow-hidden rounded-xl" style={{ border: `1px solid ${p.line}` }}>
          <svg aria-hidden viewBox="0 0 600 160" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full" style={{ opacity: 0.5 }}>
            <rect width="600" height="160" fill={p.felt} />
            {Array.from({ length: 12 }).map((_, i) => {
              const w = 44, x = i * w + 12, up = i % 2 === 0, dark = i % 2 === 0
              const fill = dark ? `rgba(0,0,0,${p.feltDark})` : p.accent
              return up
                ? <polygon key={i} points={`${x},160 ${x + w},160 ${x + w / 2},58`} fill={fill} fillOpacity={dark ? 1 : 0.55} />
                : <polygon key={i} points={`${x},0 ${x + w},0 ${x + w / 2},102`} fill={fill} fillOpacity={dark ? 1 : 0.55} />
            })}
          </svg>
          <div
            aria-hidden
            className="absolute inset-0"
            style={{ background: `linear-gradient(to right, ${p.base} 0%, ${hexA(p.base, 0.85)} 55%, transparent 100%)` }}
          />
          <div className="relative flex items-center justify-between gap-4 px-5 py-6">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: p.inkSubtle }}>Free to play</p>
              <p className="mt-1 text-xl font-bold" style={{ color: p.ink }}>Your move.</p>
            </div>
            <button
              className="shrink-0 rounded-full px-4 py-2 text-sm font-bold"
              style={{
                background: p.accent,
                color: p.accentInk,
                boxShadow: p.glossy ? `inset 0 1px 0 rgba(255,255,255,0.35)` : 'none',
              }}
            >
              Play now
            </button>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2">
          {[['Rating', '1542'], ['Streak', '3 W'], ['Win rate', '61%']].map(([label, value]) => (
            <div key={label} className="rounded-lg px-3 py-2" style={{ background: p.raised, border: `1px solid ${p.line}` }}>
              <p className="text-sm font-bold tabular-nums" style={{ color: p.accent }}>{value}</p>
              <p className="mt-0.5 text-[10px] uppercase tracking-wide" style={{ color: p.inkSubtle }}>{label}</p>
            </div>
          ))}
        </div>

        <div className="mt-3 flex items-center gap-3 rounded-lg px-3 py-2.5" style={{ background: p.raised, border: `1px solid ${p.line}` }}>
          <span
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold"
            style={{ background: hexA(p.accent, 0.18), color: p.accent }}
          >
            W
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium" style={{ color: p.ink }}>vs Maya R.</p>
          </div>
          <span className="text-sm font-bold tabular-nums" style={{ color: p.ink }}>7–4</span>
        </div>
      </div>
    </div>
  )
}

function hexA(hex: string, alpha: number): string {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16)
  return `rgba(${r},${g},${b},${alpha})`
}
