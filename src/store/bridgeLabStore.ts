import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { SPAN_CM } from '../sim/bridge'

/** Which instrument is being dragged right now; its readouts light up in the accent colour everywhere. */
export type BridgeLabActive = 'load' | 'position' | 'map' | 'graph' | null
export type BridgeTestPhase = 'idle' | 'loading' | 'broken'

/**
 * Applied load in kilograms, shared with the 3-D rig. Written together with `loadKg` so the render loop
 * can read it every frame without a React re-render.
 */
export const labLoad = { current: 0 }

interface BridgeLabState {
  /** Test load applied right now, kg. */
  loadKg: number
  /** Where along the road the load sits, cm from the left support. */
  loadX: number
  /** 1 = normal, 0.3 = slow motion. */
  speed: number
  colorMode: 'forces' | 'material'
  /** Member picked in any panel; null = follow the first piece to break. */
  selectedId: string | null
  hoverId: string | null
  active: BridgeLabActive
  phase: BridgeTestPhase
  /** Design id a pasted link was made for, when it is not the bridge on the workbench. */
  linkedDesignId: string | null
  setLoadKg: (kg: number) => void
  setLoadX: (x: number) => void
  setSpeed: (s: number) => void
  setColorMode: (m: 'forces' | 'material') => void
  setSelected: (id: string | null) => void
  setHover: (id: string | null) => void
  setActive: (a: BridgeLabActive) => void
  setLinkedDesignId: (id: string | null) => void
  /** Begin the ramp from zero. */
  start: () => void
  /** Ramp tick (keeps the phase). */
  tick: (kg: number) => void
  breakNow: () => void
  /** Stop the ramp where it is (the bridge is whole again). */
  stop: () => void
  /** A changed bridge: load off, whole again, selection cleared. */
  reset: () => void
}

export const useBridgeLabStore = create<BridgeLabState>()(
  subscribeWithSelector((set) => ({
    loadKg: 0,
    loadX: SPAN_CM / 2,
    speed: 1,
    colorMode: 'forces',
    selectedId: null,
    hoverId: null,
    active: null,
    phase: 'idle',
    linkedDesignId: null,
    setLoadKg: (kg) => {
      labLoad.current = kg
      set({ loadKg: kg, phase: 'idle' })
    },
    setLoadX: (loadX) => set((s) => ({ loadX, phase: s.phase === 'loading' ? 'idle' : s.phase === 'broken' ? 'idle' : s.phase })),
    setSpeed: (speed) => set({ speed }),
    setColorMode: (colorMode) => set({ colorMode }),
    setSelected: (selectedId) => set({ selectedId }),
    setHover: (hoverId) => set({ hoverId }),
    setActive: (active) => set({ active }),
    setLinkedDesignId: (linkedDesignId) => set({ linkedDesignId }),
    start: () => {
      labLoad.current = 0
      set({ loadKg: 0, phase: 'loading' })
    },
    tick: (kg) => {
      labLoad.current = kg
      set({ loadKg: kg })
    },
    breakNow: () => set({ phase: 'broken' }),
    stop: () => set({ phase: 'idle' }),
    reset: () => {
      labLoad.current = 0
      set({ loadKg: 0, phase: 'idle', selectedId: null, hoverId: null })
    },
  })),
)
