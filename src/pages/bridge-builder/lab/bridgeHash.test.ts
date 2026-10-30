import { describe, expect, it } from 'vitest'
import { encodeBridgeHash, hashHasTest, parseBridgeHash } from './bridgeHash'

describe('bridge lab URL hash', () => {
  it('round-trips load, position, design and selection', () => {
    const hash = encodeBridgeHash({ loadKg: 12.345, loadX: 17.5, designId: 'd_1 x', selectedId: 't3' })
    const p = parseBridgeHash(`#${hash}`)
    expect(p.view).toBe('lab')
    expect(p.loadKg).toBe(12.35)
    expect(p.loadX).toBe(17.5)
    expect(p.designId).toBe('d_1 x')
    expect(p.selectedId).toBe('t3')
    expect(hashHasTest(hash)).toBe(true)
  })

  it('clamps to the span and the load axis, ignores junk', () => {
    const p = parseBridgeHash('#view=simple&load=999&x=-4&sel=', 40)
    expect(p.view).toBe('simple')
    expect(p.loadKg).toBe(40)
    expect(p.loadX).toBe(0)
    expect(p.selectedId).toBeNull()
    expect(p.designId).toBeNull()
    expect(parseBridgeHash('#x=banana').loadX).toBeNull()
    expect(hashHasTest('#view=lab')).toBe(false)
    expect(parseBridgeHash('').loadKg).toBeNull()
  })
})
