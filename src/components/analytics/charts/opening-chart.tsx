'use client'

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from 'recharts'
import type { OpeningStats } from '@/lib/analytics'

interface OpeningChartProps {
  data: OpeningStats[]
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload as OpeningStats
  return (
    <div className="rounded-lg border border-line bg-surface-raised px-3 py-2 text-xs shadow-lg">
      <p className="font-semibold text-ink">{d.label}</p>
      <p className="mt-1 text-ink-muted">
        Matches played: <span className="font-semibold text-gold">{d.count}</span>
      </p>
      <p className="text-ink-muted">
        Avg win rate: <span className="font-semibold text-win">{d.winRate}%</span>
      </p>
    </div>
  )
}

// Color scale: gold → green based on win rate
function barColor(winRate: number): string {
  if (winRate >= 65) return 'hsl(130 60% 45%)'  // green
  if (winRate >= 50) return 'hsl(43 74% 54%)'   // gold
  if (winRate >= 40) return 'hsl(35 80% 55%)'   // amber
  return 'hsl(0 65% 55%)'                        // red
}

export function OpeningChart({ data }: OpeningChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center rounded-xl border border-line bg-surface-raised">
        <p className="text-sm text-ink-muted">No opening data yet</p>
      </div>
    )
  }

  return (
    <div className="h-48 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 4, right: 4, bottom: 4, left: -24 }}
          barCategoryGap="30%"
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="hsl(220 13% 18%)"
            vertical={false}
          />
          <XAxis
            dataKey="label"
            tick={{ fill: 'hsl(220 9% 50%)', fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            interval={0}
            angle={-20}
            textAnchor="end"
            height={40}
          />
          <YAxis
            tick={{ fill: 'hsl(220 9% 50%)', fontSize: 11 }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(220 13% 15%)' }} />
          <Bar dataKey="count" radius={[4, 4, 0, 0]}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={barColor(entry.winRate)} fillOpacity={0.85} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
