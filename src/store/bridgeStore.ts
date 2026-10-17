import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { BridgeDesign, MaterialId } from '../../shared/types'
import { DEFAULT_BUDGET, templateDesign } from '../sim/bridge'
import { newDesignId } from '../sim/presets'

export const WORKSHOP_BRIDGE = 'bridge-builder'

export function makeBridge(partial: Partial<BridgeDesign> = {}, templateId = 'warren', material: MaterialId = 'stick'): BridgeDesign {
  const now = new Date().toISOString()
  return normalizeBridge({
    id: newDesignId(),
    name: 'My First Bridge',
    workshop: WORKSHOP_BRIDGE,
    ...templateDesign(templateId, material),
    createdAt: now,
    updatedAt: now,
    ...partial,
  })
}

/** Fills in anything an older save is missing. */
export function normalizeBridge(d: Partial<BridgeDesign> & { id: string }): BridgeDesign {
  const base = templateDesign('warren', 'stick')
  const members = (d.members ?? base.members).map((m) => ({ ...m, layers: Math.min(3, Math.max(1, Math.round(m.layers ?? 1))) }))
  return {
    name: 'Bridge',
    workshop: WORKSHOP_BRIDGE,
    nodes: base.nodes,
    loadMode: 'center',
    budget: DEFAULT_BUDGET,
    ...d,
    members,
  }
}

interface BridgeState {
  design: BridgeDesign
  dirty: boolean
  /** Material used for the next piece placed. */
  material: MaterialId
  layers: number
  update: (patch: Partial<BridgeDesign>) => void
  load: (design: BridgeDesign) => void
  startFromTemplate: (templateId: string, material?: MaterialId) => void
  markSaved: (design: BridgeDesign) => void
  setMaterial: (m: MaterialId) => void
  setLayers: (n: number) => void
}

export const useBridgeStore = create<BridgeState>()(
  persist(
    (set, get) => ({
      design: makeBridge(),
      dirty: false,
      material: 'stick',
      layers: 1,
      update: (patch) => set((s) => ({ design: { ...s.design, ...patch }, dirty: true })),
      load: (design) => set({ design: normalizeBridge(design), dirty: false }),
      startFromTemplate: (templateId, material) =>
        set({
          design: makeBridge({ name: get().design.name === 'My First Bridge' ? 'My First Bridge' : 'New Bridge', loadMode: get().design.loadMode, budget: get().design.budget }, templateId, material ?? get().material),
          dirty: false,
        }),
      markSaved: (design) => set({ design, dirty: false }),
      setMaterial: (material) => set({ material }),
      setLayers: (layers) => set({ layers: Math.min(3, Math.max(1, layers)) }),
    }),
    {
      name: 'bot:bridge-workbench:v1',
      partialize: (s) => ({ design: s.design, dirty: s.dirty, material: s.material, layers: s.layers }),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<BridgeState>
        return { ...current, ...p, design: p.design ? normalizeBridge(p.design) : current.design }
      },
    },
  ),
)
