import { describe, expect, it } from 'vitest'
import { DEFAULT_DESIGN, SAMPLE_DESIGNS } from '../sim/presets'
import { encodeLabHash, hashHasDesign, parseLabHash } from './designHash'

describe('lab URL hash', () => {
  it('round-trips every parameter the simulator reads', () => {
    for (const sample of [DEFAULT_DESIGN, ...SAMPLE_DESIGNS]) {
      const design = { ...DEFAULT_DESIGN, ...sample, id: 'x', waterFraction: 0.37, pressurePsi: 43, launchAngleDeg: 67 }
      const hash = encodeLabHash(design, { metric: 'range' })
      const parsed = parseLabHash(`#${hash}`)
      expect(parsed.view).toBe('lab')
      expect(parsed.metric).toBe('range')
      const d = parsed.design
      expect(d.waterFraction).toBe(0.37)
      expect(d.pressurePsi).toBe(43)
      expect(d.launchAngleDeg).toBe(67)
      expect(d.bottleVolumeL).toBe(design.bottleVolumeL)
      expect(d.dryMassG).toBe(design.dryMassG)
      expect(d.nozzleDiameterMm).toBe(design.nozzleDiameterMm)
      expect(d.noseShape).toBe(design.noseShape)
      expect(d.finCount).toBe(design.finCount)
      expect(d.recovery).toBe(design.recovery)
      expect(d.windMs ?? 0).toBe(design.windMs)
      if (design.recovery === 'parachute') expect(d.parachuteDiameterM).toBe(design.parachuteDiameterM)
      expect(d.boosters ?? []).toEqual(design.boosters)
    }
  })

  it('clamps out-of-range and ignores junk', () => {
    const p = parseLabHash('#view=lab&w=9&p=-3&a=200&nose=banana&fins=7&v=1.4&b=2_0.3_22_90,junk,2_0.3_22_90,2_0.3_22_90')
    expect(p.design.waterFraction).toBe(0.8)
    expect(p.design.pressurePsi).toBe(10)
    expect(p.design.launchAngleDeg).toBe(90)
    expect(p.design.noseShape).toBeUndefined()
    expect(p.design.finCount).toBeUndefined()
    expect(p.design.bottleVolumeL).toBe(1.5)
    expect(p.design.boosters).toHaveLength(2)
    expect(hashHasDesign('#view=lab')).toBe(false)
    expect(hashHasDesign('#w=0.3')).toBe(true)
    expect(parseLabHash('').design).toEqual({})
  })
})
