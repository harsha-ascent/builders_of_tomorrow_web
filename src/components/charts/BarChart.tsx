export interface BarDatum {
  label: string
  value: number
  color?: string
}

/** Small labelled bar chart for comparisons (materials, patterns, lengths). */
export function BarChart({ data, yLabel, color = '#4cc9f0', digits = 0, highlight }: { data: BarDatum[]; yLabel: string; color?: string; digits?: number; highlight?: string }) {
  const W = 640
  const H = 240
  const padL = 44
  const padB = 44
  const padT = 24
  const max = Math.max(1e-9, ...data.map((d) => d.value))
  // Counts (digits = 0) always get a 0–1 axis at least, so an empty chart does not show 0.0 / 0.1 ticks.
  const nice = max > 10 ? Math.ceil(max / 10) * 10 : max > 1 ? Math.ceil(max) : digits === 0 ? 1 : Math.ceil(max * 10) / 10
  const bw = (W - padL - 12) / Math.max(data.length, 1)
  const yOf = (v: number) => padT + (H - padT - padB) * (1 - v / nice)
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={yLabel}>
      {[0, 0.5, 1].map((f) => (
        <g key={f}>
          <line x1={padL} x2={W - 8} y1={yOf(f * nice)} y2={yOf(f * nice)} stroke="#1e2a4a" strokeOpacity={0.1} />
          <text x={padL - 6} y={yOf(f * nice) + 4} textAnchor="end" fontSize={11} fontWeight={700} fill="#4a5578">
            {(f * nice).toFixed(nice < 1 ? 1 : 0)}
          </text>
        </g>
      ))}
      {data.map((d, i) => {
        const x = padL + i * bw + bw * 0.15
        const w = bw * 0.7
        const y = yOf(d.value)
        const hi = highlight !== undefined && d.label === highlight
        return (
          <g key={d.label}>
            <title>{`${d.label}: ${d.value.toFixed(digits)}`}</title>
            <rect x={x} y={y} width={w} height={Math.max(0, H - padB - y)} rx={8} fill={d.color ?? (hi ? '#ff6b6b' : color)} opacity={hi || !highlight ? 1 : 0.6} />
            <text x={x + w / 2} y={y - 6} textAnchor="middle" fontSize={12} fontWeight={800} fill="#1e2a4a">
              {d.value.toFixed(digits)}
            </text>
            <text x={x + w / 2} y={H - padB + 16} textAnchor="middle" fontSize={12} fontWeight={700} fill="#4a5578">
              {d.label}
            </text>
          </g>
        )
      })}
      <text x={12} y={14} fontSize={11} fontWeight={800} fill="#4a5578">
        {yLabel}
      </text>
    </svg>
  )
}
