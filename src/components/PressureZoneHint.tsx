import { pressureZone, SAFETY, type PressureZone } from '../sim/rocket'

const tone: Record<PressureZone, string> = {
  green: 'bg-grass/30 text-ink',
  amber: 'bg-sun/50 text-ink',
  red: 'bg-rocket/20 text-rocket-dark',
}
const dot: Record<PressureZone, string> = { green: '🟢', amber: '🟡', red: '🔴' }

/** Real-world safety guidance shown under every pressure slider. */
export function PressureZoneHint({ psi }: { psi: number }) {
  const z = pressureZone(psi)
  return (
    <div className="mt-1 text-sm">
      <span className={`mr-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-extrabold ${tone[z.zone]}`}>
        {dot[z.zone]} {z.label}
      </span>
      <span className="text-ink-soft">{z.advice}</span>
      <div className="mt-1 flex h-2 overflow-hidden rounded-full">
        <div className="bg-grass" style={{ width: `${(SAFETY.schoolMaxPsi / 80) * 100}%` }} />
        <div className="bg-sun" style={{ width: `${((SAFETY.supervisedMaxPsi - SAFETY.schoolMaxPsi) / 80) * 100}%` }} />
        <div className="bg-rocket" style={{ width: `${((80 - SAFETY.supervisedMaxPsi) / 80) * 100}%` }} />
      </div>
      <div className="flex justify-between text-[10px] font-bold text-ink-soft">
        <span>0</span>
        <span>{SAFETY.schoolMaxPsi} psi school</span>
        <span>{SAFETY.supervisedMaxPsi} psi adult</span>
        <span>80</span>
      </div>
    </div>
  )
}
