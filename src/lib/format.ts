export const fmt = {
  m: (v: number, digits = 1) => `${v.toFixed(digits)} m`,
  s: (v: number, digits = 1) => `${v.toFixed(digits)} s`,
  ms: (v: number, digits = 0) => `${v.toFixed(digits)} m/s`,
  kmh: (ms: number) => `${(ms * 3.6).toFixed(0)} km/h`,
  pct: (f: number) => `${Math.round(f * 100)}%`,
  psi: (v: number) => `${Math.round(v)} psi`,
  kpa: (v: number) => `${Math.round(v)} kPa`,
  litres: (l: number, fraction: number) => {
    const ml = Math.round(l * fraction * 1000)
    return ml >= 1000 ? `${(ml / 1000).toFixed(2)} L` : `${ml} ml`
  },
  deg: (v: number) => `${Math.round(v)}°`,
  g: (v: number) => `${Math.round(v)} g`,
  date: (iso?: string) =>
    iso ? new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '',
  time: (iso?: string) =>
    iso ? new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) : '',
}

/** Fun real-world comparisons for a height in metres. */
export function heightComparison(m: number): string {
  if (m < 2) return 'about as tall as a grown-up'
  if (m < 5) return 'as tall as a giraffe'
  if (m < 10) return 'as tall as a 3-storey house'
  if (m < 20) return 'as tall as a big tree'
  if (m < 35) return 'as tall as a 10-storey building'
  if (m < 60) return 'as tall as the Leaning Tower of Pisa'
  if (m < 100) return 'higher than the Statue of Liberty'
  return 'higher than a 30-storey skyscraper!'
}

export function speedComparison(ms: number): string {
  const kmh = ms * 3.6
  if (kmh < 30) return 'as fast as a sprinting kid'
  if (kmh < 60) return 'as fast as a racing cyclist'
  if (kmh < 110) return 'as fast as a car on the highway'
  if (kmh < 200) return 'as fast as a cheetah... times two'
  return 'as fast as a speeding train!'
}
