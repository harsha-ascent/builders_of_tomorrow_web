import { describe, expect, it } from 'vitest'
import { DEFAULT_DESIGN } from './presets'
import { pressureZone, sampleAt, simulateLaunch, sweep, terminalVelocity } from './rocket'
import { normalizeDesign } from './presets'

const base = { ...DEFAULT_DESIGN, launchAngleDeg: 90 }

describe('simulateLaunch', () => {
  it('flies a typical 2 L school rocket (40 psi) to a believable height', () => {
    const r = simulateLaunch(base)
    expect(base.pressurePsi).toBe(40)
    expect(r.liftedOff).toBe(true)
    // Real 2 L rockets at 40 psi usually reach 20-40 m.
    expect(r.maxHeightM).toBeGreaterThan(20)
    expect(r.maxHeightM).toBeLessThan(45)
    expect(r.flightTimeS).toBeGreaterThan(3)
    expect(r.flightTimeS).toBeLessThan(15)
    expect(r.thrustTimeS).toBeGreaterThan(0.03)
    expect(r.thrustTimeS).toBeLessThan(0.6)
    expect(r.samples.at(-1)?.phase).toBe('landed')
    expect(r.samples.at(-1)?.y).toBe(0)
  })

  it('goes higher with more pressure, within real-world ranges', () => {
    const low = simulateLaunch({ ...base, pressurePsi: 40 })
    const mid = simulateLaunch({ ...base, pressurePsi: 60 })
    const high = simulateLaunch({ ...base, pressurePsi: 75 })
    expect(mid.maxHeightM).toBeGreaterThan(low.maxHeightM)
    expect(high.maxHeightM).toBeGreaterThan(mid.maxHeightM)
    // Well-built 2 L rockets at 60 psi: roughly 30-55 m; competition rockets at 75 psi: 40-65 m.
    expect(mid.maxHeightM).toBeGreaterThan(30)
    expect(mid.maxHeightM).toBeLessThan(55)
    expect(high.maxHeightM).toBeLessThan(65)
  })

  it('an air-only launch flies, but much lower than with water', () => {
    const air = simulateLaunch({ ...base, waterFraction: 0, pressurePsi: 60 })
    const water = simulateLaunch({ ...base, waterFraction: 0.35, pressurePsi: 60 })
    expect(air.liftedOff).toBe(true)
    expect(air.maxHeightM).toBeLessThan(water.maxHeightM * 0.6)
  })

  it('pressure zones match the safety guidance', () => {
    expect(pressureZone(30).zone).toBe('green')
    expect(pressureZone(40).zone).toBe('green')
    expect(pressureZone(50).zone).toBe('amber')
    expect(pressureZone(70).zone).toBe('red')
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

describe('parachute, stages and wind', () => {
  it('a parachute makes the landing soft and the flight long, at a small height cost', () => {
    const plain = simulateLaunch(base)
    const chute = simulateLaunch({ ...base, recovery: 'parachute', parachuteDiameterM: 0.6 })
    expect(plain.safeLanding).toBe(false)
    expect(plain.landingSpeedMs).toBeGreaterThan(15)
    expect(chute.safeLanding).toBe(true)
    expect(chute.landingSpeedMs).toBeLessThan(7)
    expect(chute.flightTimeS).toBeGreaterThan(plain.flightTimeS * 1.5)
    expect(chute.maxHeightM).toBeLessThan(plain.maxHeightM)
    expect(chute.maxHeightM).toBeGreaterThan(plain.maxHeightM * 0.8)
    expect(chute.parachuteDeployedAtS).not.toBeNull()
    expect(chute.events.map((e) => e.type)).toEqual(['liftoff', 'burnout', 'apogee', 'parachute', 'landed'])
    // the formula and the simulator should agree on the descent speed within ~15 %
    expect(Math.abs(chute.landingSpeedMs - terminalVelocity({ ...base, recovery: 'parachute', parachuteDiameterM: 0.6 }))).toBeLessThan(1)
  })

  it('a bigger canopy lands slower', () => {
    const rows = sweep({ ...base, recovery: 'parachute' }, 'parachuteDiameterM', [0.3, 0.6, 0.9])
    expect(rows[0].landingSpeedMs).toBeGreaterThan(rows[1].landingSpeedMs)
    expect(rows[1].landingSpeedMs).toBeGreaterThan(rows[2].landingSpeedMs)
  })

  it('a booster stage lifts the same top stage higher and separates once', () => {
    const top = { ...base, bottleVolumeL: 1, dryMassG: 90, waterFraction: 0.33, pressurePsi: 50 }
    const single = simulateLaunch(top)
    const twoStage = simulateLaunch({ ...top, boosters: [{ bottleVolumeL: 2, waterFraction: 0.35, nozzleDiameterMm: 22, dryMassG: 100 }] })
    expect(twoStage.stageCount).toBe(2)
    expect(twoStage.stageSeparationsS).toHaveLength(1)
    expect(twoStage.maxHeightM).toBeGreaterThan(single.maxHeightM * 1.25)
    expect(twoStage.events.filter((e) => e.type === 'stage-separation')).toHaveLength(1)
    const sepIdx = twoStage.samples.findIndex((s) => s.attached === 1)
    expect(sepIdx).toBeGreaterThan(0)
    expect(twoStage.samples[sepIdx - 1].attached).toBe(2)
  })

  it('wind drifts a parachuting rocket downrange', () => {
    const calm = simulateLaunch({ ...base, recovery: 'parachute', windMs: 0 })
    const breezy = simulateLaunch({ ...base, recovery: 'parachute', windMs: 3 })
    expect(breezy.rangeM).toBeGreaterThan(calm.rangeM + 10)
  })

  it('normalizeDesign fills in fields older saves do not have', () => {
    const d = normalizeDesign({ id: 'x', name: 'Old', pressurePsi: 35 } as never)
    expect(d.boosters).toEqual([])
    expect(d.recovery).toBe('none')
    expect(d.windMs).toBe(0)
    expect(d.pressurePsi).toBe(35)
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
