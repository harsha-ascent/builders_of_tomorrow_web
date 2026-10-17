import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { LaunchResult, RocketDesign } from '../../shared/types'
import { DEFAULT_DESIGN, makeDesign } from '../sim/presets'

interface DesignState {
  /** The rocket currently on the workbench / launch pad. */
  design: RocketDesign
  /** Set when the current design has unsaved edits. */
  dirty: boolean
  lastResult: LaunchResult | null
  update: (patch: Partial<RocketDesign>) => void
  load: (design: RocketDesign) => void
  startNew: () => void
  markSaved: (design: RocketDesign) => void
  setLastResult: (r: LaunchResult | null) => void
}

export const useDesignStore = create<DesignState>()(
  persist(
    (set) => ({
      design: makeDesign({ name: DEFAULT_DESIGN.name }),
      dirty: false,
      lastResult: null,
      update: (patch) =>
        set((s) => ({ design: { ...s.design, ...patch }, dirty: true, lastResult: null })),
      load: (design) => set({ design, dirty: false, lastResult: null }),
      startNew: () => set({ design: makeDesign({ name: 'New Rocket' }), dirty: false, lastResult: null }),
      markSaved: (design) => set({ design, dirty: false }),
      setLastResult: (lastResult) => set({ lastResult }),
    }),
    {
      name: 'bot:workbench:v1',
      partialize: (s) => ({ design: s.design, dirty: s.dirty }),
    },
  ),
)
