import { describe, expect, it } from 'vitest'
import { DEFAULT_DESIGN } from './presets'
import { sampleAt, simulateLaunch, sweep } from './rocket'

const base = { ...DEFAULT_DESIGN, launchAngleDeg: 90 }

describe('simulateLaunch', () => {
  it('flies a typical 2 L rocket to a believable height', () => {
    const r = simulateLaunch(base)
    expect(r.liftedOff).toBe(true)
    expect(r.maxHeightM).toBeGreaterThan(15)
    expect(r.maxHeightM).toBeLessThan(90)
    expect(r.flightTimeS).toBeGreaterThan(3)
    expect(r.flightTimeS).toBeLessThan(15)
    expect(r.thrustTimeS).toBeGreaterThan(0.03)
    expect(r.thrustTimeS).toBeLessThan(0.6)
    expect(r.samples.at(-1)?.phase).toBe('landed')
    expect(r.samples.at(-1)?.y).toBe(0)
  })

  it('goes higher with more pressure', () => {
    const low = simulateLaunch({ ...base, pressurePsi: 40 })
    const high = simulateLaunch({ ...base, pressurePsi: 80 })
    expect(high.maxHeightM).toBeGreaterThan(low.maxHeightM)
  })

  it('has a sweet spot for water: some is better than none or nearly full', () => {
    const none = simulateLaunch({ ...base, waterFraction: 0 })
    const some = simulateLaunch({ ...base, waterFraction: 0.35 })
    const lots = simulateLaunch({ ...base, waterFraction: 0.8 })
    expect(some.maxHeightM).toBeGreaterThan(none.maxHeightM)
    expect(some.maxHeightM).toBeGreaterThan(lots.maxHeightM)
  })

  it('goes highest straight up and furthest at a middle angle', () => {
    const up = simulateLaunch({ ...base, launchAngleDeg: 90 })
    const mid = simulateLaunch({ ...base, launchAngleDeg: 45 })
    const low = simulateLaunch({ ...base, launchAngleDeg: 25 })
    expect(up.maxHeightM).toBeGreaterThan(mid.maxHeightM)
    expect(mid.rangeM).toBeGreaterThan(up.rangeM)
    expect(mid.rangeM).toBeGreaterThan(low.rangeM)
    // straight up should land close to the pad
    expect(Math.abs(up.rangeM)).toBeLessThan(2)
  })

  it('stays on the pad when it is too heavy for the pressure', () => {
    const r = simulateLaunch({
      ...base,
      nozzleDiameterMm: 9,
      pressurePsi: 10,
      waterFraction: 0.8,
      dryMassG: 400,
    })
    expect(r.liftedOff).toBe(false)
    expect(r.maxHeightM).toBe(0)
  })

  it('pointy noses fly higher than flat ones', () => {
    const pointy = simulateLaunch({ ...base, noseShape: 'pointy' })
    const flat = simulateLaunch({ ...base, noseShape: 'flat' })
    expect(pointy.maxHeightM).toBeGreaterThan(flat.maxHeightM)
  })

  it('a narrow nozzle burns longer than an open neck', () => {
    const open = simulateLaunch({ ...base, nozzleDiameterMm: 22 })
    const narrow = simulateLaunch({ ...base, nozzleDiameterMm: 9 })
    expect(narrow.thrustTimeS).toBeGreaterThan(open.thrustTimeS)
  })
})

describe('helpers', () => {
  it('sweep returns one row per value', () => {
    const rows = sweep(base, 'pressurePsi', [30, 50, 70])
    expect(rows.map((r) => r.value)).toEqual([30, 50, 70])
    expect(rows[2].maxHeightM).toBeGreaterThan(rows[0].maxHeightM)
  })

  it('sampleAt interpolates between samples', () => {
    const r = simulateLaunch(base)
    const a = r.samples[10]
    const b = r.samples[11]
    const mid = sampleAt(r.samples, (a.t + b.t) / 2)
    expect(mid.y).toBeGreaterThanOrEqual(Math.min(a.y, b.y) - 1e-9)
    expect(mid.y).toBeLessThanOrEqual(Math.max(a.y, b.y) + 1e-9)
    expect(sampleAt(r.samples, -1)).toBe(r.samples[0])
    expect(sampleAt(r.samples, 1e9)).toBe(r.samples.at(-1))
  })
})
