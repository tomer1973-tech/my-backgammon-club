/**
 * Tiny inline SVG sparkline — no external deps.
 * Used for win-rate micro-charts inside stat cards.
 */

interface SparklineProps {
  data:   number[]   // values 0–100
  width?: number
  height?: number
  color?: string
  className?: string
}

export function Sparkline({
  data,
  width  = 80,
  height = 28,
  color  = 'hsl(43 74% 54%)',   // gold
  className,
}: SparklineProps) {
  if (data.length < 2) return null

  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1

  const pad = 2
  const w   = width  - pad * 2
  const h   = height - pad * 2

  const points = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * w
    const y = pad + (1 - (v - min) / range) * h
    return `${x},${y}`
  })

  const polyline = points.join(' ')

  // Area fill path
  const areaPath = [
    `M ${points[0]}`,
    points.slice(1).map(p => `L ${p}`).join(' '),
    `L ${pad + w},${pad + h}`,
    `L ${pad},${pad + h}`,
    'Z',
  ].join(' ')

  const fillId = `sparkfill-${Math.random().toString(36).slice(2)}`

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${fillId})`} />
      <polyline
        points={polyline}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Last point dot */}
      <circle
        cx={pad + w}
        cy={parseFloat(points[points.length - 1].split(',')[1])}
        r="2"
        fill={color}
      />
    </svg>
  )
}
