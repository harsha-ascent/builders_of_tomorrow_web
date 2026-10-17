import { describe, expect, it } from 'vitest'
import type { BridgeDesign } from '../../shared/types'
import { MATERIALS, SPAN_CM, analyzeBridge, compressionLimitN, templateDesign } from './bridge'

function design(templateId: string, material: 'stick' | 'straw' | 'spaghetti' | 'balsa' = 'stick', loadMode: 'center' | 'truck' = 'center'): BridgeDesign {
  return { id: 'b', name: 't', workshop: 'bridge-builder', ...templateDesign(templateId, material, { loadMode }) }
}

describe('materials', () => {
  it('long thin pieces buckle long before they crush', () => {
    expect(compressionLimitN(MATERIALS.spaghetti, 10)).toBeLessThan(5)
    expect(compressionLimitN(MATERIALS.stick, 5)).toBeGreaterThan(200)
    expect(compressionLimitN(MATERIALS.stick, 15)).toBeLessThan(compressionLimitN(MATERIALS.stick, 5))
  })
})

describe('analyzeBridge', () => {
  it('a flat beam with no triangles is a mechanism', () => {
    const r = analyzeBridge(design('beam'))
    expect(r.ok).toBe(false)
    expect(r.problem).toBe('mechanism')
  })

  it('a craft-stick Warren truss holds a classroom-sized load', () => {
    const r = analyzeBridge(design('warren'))
    expect(r.ok).toBe(true)
    // Real craft-stick bridges of this size hold tens of kilograms.
    expect(r.capacityKg).toBeGreaterThan(5)
    expect(r.capacityKg).toBeLessThan(80)
    expect(r.firstToBreak).not.toBeNull()
    expect(r.members.every((m) => m.utilization <= 1 + 1e-9)).toBe(true)
    expect(r.members.filter((m) => Math.abs(m.utilization - 1) < 1e-6).length).toBeGreaterThanOrEqual(1)
    expect(r.maxDeflectionMm).toBeGreaterThan(0)
    expect(r.massG).toBeGreaterThan(5)
    expect(r.costCoins).toBeGreaterThan(0)
  })

  it('a spaghetti bridge is far weaker than a craft-stick one and fails by buckling', () => {
    const stick = analyzeBridge(design('warren', 'stick'))
    const pasta = analyzeBridge(design('warren', 'spaghetti'))
    expect(pasta.ok).toBe(true)
    expect(pasta.capacityKg).toBeLessThan(stick.capacityKg / 5)
    expect(pasta.failureMode).toBe('buckling')
  })

  it('top chord is in compression and bottom chord in tension for a deck truss', () => {
    const r = analyzeBridge(design('warren'))
    const top = r.members.find((m) => m.id === 't4')! // t1-t2 top chord
    const bottom = r.members.find((m) => m.id === 't1')! // d1-d2 deck
    expect(top.forceN).toBeLessThan(0)
    expect(bottom.forceN).toBeGreaterThan(0)
  })

  it('a truck test is never easier than the centre bucket', () => {
    const centre = analyzeBridge(design('pratt', 'stick', 'center'))
    const truck = analyzeBridge(design('pratt', 'stick', 'truck'))
    expect(truck.ok && centre.ok).toBe(true)
    expect(truck.capacityKg).toBeLessThanOrEqual(centre.capacityKg + 1e-6)
    expect(truck.worstLoadX).toBeGreaterThan(0)
    expect(truck.worstLoadX).toBeLessThan(SPAN_CM)
  })

  it('reports a gap in the road', () => {
    const d = design('warren')
    d.members = d.members.filter((m) => !(m.a === 'd1' && m.b === 'd2'))
    const r = analyzeBridge(d)
    expect(r.problem).toBe('no-deck')
  })

  it('reports pieces that are too long for the material', () => {
    const d = design('kingpost', 'stick')
    const r = analyzeBridge(d) // L-d1 is 20 cm, longer than a 15 cm craft stick
    expect(r.problem).toBe('too-long')
    expect(r.tooLongMembers.length).toBeGreaterThan(0)
  })

  it('prints a calibration table', () => {
    const rows: string[] = []
    for (const t of ['warren', 'pratt', 'howe', 'underslung'] as const) {
      for (const m of ['stick', 'balsa', 'straw', 'spaghetti'] as const) {
        const r = analyzeBridge(design(t, m))
        rows.push(`${t.padEnd(10)} ${m.padEnd(9)} | ${r.ok ? `${r.capacityKg.toFixed(1).padStart(5)} kg` : `FAIL ${r.problem}`} | ${r.failureMode ?? '-'} | ${r.firstToBreak} | sag ${r.maxDeflectionMm} mm | ${r.massG} g | ${r.costCoins} coins | eff ${r.efficiency}`)
      }
    }
    console.log('\nBRIDGE CALIB\n' + rows.join('\n') + '\n')
    expect(rows.length).toBe(16)
  })

  it('doubling up the pieces makes the bridge much stronger, heavier and dearer', () => {
    const single = analyzeBridge(design('warren'))
    const d = design('warren')
    d.members = d.members.map((m) => ({ ...m, layers: 2 }))
    const doubled = analyzeBridge(d)
    expect(doubled.ok).toBe(true)
    expect(doubled.capacityKg).toBeGreaterThan(single.capacityKg * 2.5)
    expect(doubled.massG).toBeCloseTo(single.massG * 2, 0)
    expect(doubled.costCoins).toBeCloseTo(single.costCoins * 2, 0)
    // "holds N times its own weight" should be in the hundreds for craft sticks
    expect(single.efficiency).toBeGreaterThan(100)
  })

  it('reports a dangling joint', () => {
    const d = design('warren')
    d.nodes.push({ id: 'x', x: 20, y: 15 })
    d.members.push({ id: 'mx', a: 't2', b: 'x', material: 'stick' })
    const r = analyzeBridge(d)
    expect(r.problem).toBe('dangling')
  })

  it('a taller truss is stronger than a flat one of the same pattern', () => {
    const short = design('warren')
    const tall = design('warren')
    for (const n of tall.nodes) if (n.y === 10) n.y = 12 // diagonals stay under the 15 cm stick limit
    const rs = analyzeBridge(short)
    const rt = analyzeBridge(tall)
    expect(rt.capacityKg).toBeGreaterThan(rs.capacityKg)
  })
})
