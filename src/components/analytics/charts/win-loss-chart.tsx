'use client'

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Area,
  AreaChart,
} from 'recharts'

interface WinLossChartProps {
  data: {
    match:          number
    date:           string
    cumulativeWins: number
    winRate:        number
  }[]
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="rounded-lg border border-line bg-surface-raised px-3 py-2 text-xs shadow-lg">
      <p className="font-semibold text-ink">Match {d.match} · {d.date}</p>
      <p className="mt-1 text-ink-muted">
        Win rate: <span className="font-semibold text-gold">{d.winRate}%</span>
      </p>
      <p className="text-ink-muted">
        Cumulative: <span className="font-semibold text-win">{d.cumulativeWins}W</span>
        <span className="mx-1 text-ink-subtle">/</span>
        <span className="text-ink">{d.match} total</span>
      </p>
    </div>
  )
}

export function WinLossChart({ data }: WinLossChartProps) {
  if (data.length < 2) {
    return (
      <div className="flex h-48 items-center justify-center rounded-xl border border-line bg-surface-raised">
        <p className="text-sm text-ink-muted">Not enough match data yet</p>
      </div>
    )
  }

  return (
    <div className="h-48 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 4, left: -24 }}>
          <defs>
            <linearGradient id="winRateGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="hsl(43 74% 54%)" stopOpacity={0.25} />
              <stop offset="95%" stopColor="hsl(43 74% 54%)" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="hsl(220 13% 18%)"
            vertical={false}
          />
          <XAxis
            dataKey="match"
            tick={{ fill: 'hsl(220 9% 50%)', fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            label={{ value: 'Match #', position: 'insideBottom', offset: -2, fill: 'hsl(220 9% 40%)', fontSize: 10 }}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fill: 'hsl(220 9% 50%)', fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={v => `${v}%`}
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine y={50} stroke="hsl(220 13% 25%)" strokeDasharray="4 4" />
          <Area
            type="monotone"
            dataKey="winRate"
            stroke="hsl(43 74% 54%)"
            strokeWidth={2}
            fill="url(#winRateGrad)"
            dot={false}
            activeDot={{ r: 4, fill: 'hsl(43 74% 54%)', strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
