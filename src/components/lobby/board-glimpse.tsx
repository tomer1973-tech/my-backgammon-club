/**
 * BoardGlimpse — decorative angled fragment of a backgammon board used as the
 * lobby hero background. Pure SVG, theme-token-driven, no interactivity.
 */
export function BoardGlimpse({ className }: { className?: string }) {
  const points = Array.from({ length: 12 })
  return (
    <svg
      aria-hidden
      viewBox="0 0 600 260"
      preserveAspectRatio="xMidYMid slice"
      className={className ?? 'absolute inset-0 h-full w-full opacity-[0.5]'}
    >
      <defs>
        <linearGradient id="bg-felt" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"  stopColor="hsl(158 40% 18%)" />
          <stop offset="100%" stopColor="hsl(158 45% 9%)" />
        </linearGradient>
        <radialGradient id="bg-spot" cx="50%" cy="0%" r="80%">
          <stop offset="0%"  stopColor="hsl(var(--gold) / 0.22)" />
          <stop offset="60%" stopColor="transparent" />
        </radialGradient>
        <linearGradient id="bg-fadeR" x1="0" y1="0" x2="1" y2="0">
          <stop offset="55%" stopColor="transparent" />
          <stop offset="100%" stopColor="hsl(var(--surface-base))" />
        </linearGradient>
      </defs>

      <rect width="600" height="260" fill="url(#bg-felt)" />

      {points.map((_, i) => {
        const w = 44
        const x = i * w + 12
        const up = i % 2 === 0
        const dark = i % 2 === 0
        const fill = dark ? 'hsl(220 16% 20%)' : 'hsl(var(--gold) / 0.55)'
        return up ? (
          <polygon key={i} points={`${x},260 ${x + w},260 ${x + w / 2},96`} fill={fill} />
        ) : (
          <polygon key={i} points={`${x},0 ${x + w},0 ${x + w / 2},164`} fill={fill} />
        )
      })}

      {[0, 1, 2].map(s => (
        <circle key={`a${s}`} cx={34} cy={244 - s * 24} r="17" fill="hsl(36 30% 88%)" stroke="hsl(36 20% 70%)" />
      ))}
      {[0, 1].map(s => (
        <circle key={`b${s}`} cx={606 - 34} cy={16 + s * 24} r="17" fill="hsl(220 14% 12%)" stroke="hsl(var(--gold) / 0.6)" />
      ))}

      <rect width="600" height="260" fill="url(#bg-spot)" />
      <rect width="600" height="260" fill="url(#bg-fadeR)" />
    </svg>
  )
}
