interface Row {
  value: number
  maxHeightM: number
  rangeM: number
  landingSpeedMs?: number
  flightTimeS?: number
}

type Metric = 'maxHeightM' | 'rangeM' | 'landingSpeedMs' | 'flightTimeS'

interface SweepChartProps {
  data: Row[]
  metric: Metric
  formatX: (v: number) => string
  highlight?: number
  color?: string
  xLabel: string
  /** Y-axis caption; defaults to the metric's own label. */
  yLabel?: string
  digits?: number
}

const METRIC_LABEL: Record<Metric, string> = {
  maxHeightM: 'Height (m)',
  rangeM: 'Distance (m)',
  landingSpeedMs: 'Landing speed (m/s)',
  flightTimeS: 'Flight time (s)',
}

/** Chunky bar chart (pure SVG) for "what happens if I change X?" explorations. */
export function SweepChart({ data, metric, formatX, highlight, color = '#4cc9f0', xLabel, yLabel, digits = 0 }: SweepChartProps) {
  const W = 640
  const H = 260
  const padL = 44
  const padB = 44
  const padT = 24
  const val = (d: Row) => d[metric] ?? 0
  const max = Math.max(1, ...data.map(val))
  const niceMax = max > 10 ? Math.ceil(max / 10) * 10 : Math.ceil(max)
  const bw = (W - padL - 12) / data.length
  const yOf = (v: number) => padT + (H - padT - padB) * (1 - v / niceMax)
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * niceMax)
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={`${yLabel ?? METRIC_LABEL[metric]} vs ${xLabel}`}>
      {ticks.map((t) => (
        <g key={t}>
          <line x1={padL} x2={W - 8} y1={yOf(t)} y2={yOf(t)} stroke="#1e2a4a" strokeOpacity={0.1} />
          <text x={padL - 6} y={yOf(t) + 4} textAnchor="end" fontSize={11} fontWeight={700} fill="#4a5578">
            {Math.round(t)}
          </text>
        </g>
      ))}
      {data.map((d, i) => {
        const v = val(d)
        const x = padL + i * bw + bw * 0.15
        const w = bw * 0.7
        const y = yOf(v)
        const isHi = highlight !== undefined && Math.abs(d.value - highlight) < 1e-6
        return (
          <g key={d.value}>
            <rect x={x} y={y} width={w} height={Math.max(0, H - padB - y)} rx={8} fill={isHi ? '#ff6b6b' : color} opacity={isHi ? 1 : 0.85} />
            <text x={x + w / 2} y={y - 6} textAnchor="middle" fontSize={12} fontWeight={800} fill="#1e2a4a">
              {v.toFixed(digits)}
            </text>
            <text x={x + w / 2} y={H - padB + 16} textAnchor="middle" fontSize={12} fontWeight={700} fill="#4a5578">
              {formatX(d.value)}
            </text>
          </g>
        )
      })}
      <text x={W / 2} y={H - 6} textAnchor="middle" fontSize={12} fontWeight={800} fill="#1e2a4a">
        {xLabel}
      </text>
      <text x={12} y={14} fontSize={11} fontWeight={800} fill="#4a5578">
        {yLabel ?? METRIC_LABEL[metric]}
      </text>
    </svg>
  )
}
