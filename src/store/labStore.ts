import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'

export type LabMetric = 'height' | 'range'
/** Which instrument is being dragged right now; its readouts light up in the accent colour everywhere. */
export type LabActive = 'water' | 'pressure' | 'angle' | 'map' | 'time' | null

/**
 * Playback clock shared with the 3-D scene. Written together with `time` so the render loop can read
 * it every frame without a React re-render.
 */
export const labClock = { current: 0 }

interface LabState {
  playing: boolean
  /** Playback time in seconds (mirrors `labClock`). 0 = rocket on the pad. */
  time: number
  /** True once playback has reached the end of the flight. */
  done: boolean
  /** 1 = real time, 0.25 = slow motion. */
  speed: number
  /** What the parameter map is shaded by. */
  metric: LabMetric
  active: LabActive
  play: () => void
  pause: () => void
  reset: () => void
  setTime: (t: number) => void
  /** Jump to a time and stop playing (dragging the time cursor). */
  scrub: (t: number) => void
  finish: () => void
  setSpeed: (s: number) => void
  setMetric: (m: LabMetric) => void
  setActive: (a: LabActive) => void
}

export const useLabStore = create<LabState>()(
  subscribeWithSelector((set) => ({
    playing: false,
    time: 0,
    done: false,
    speed: 1,
    metric: 'height',
    active: null,
    play: () =>
      set((s) => {
        const time = s.done ? 0 : s.time
        labClock.current = time
        return { playing: true, done: false, time }
      }),
    pause: () => set({ playing: false }),
    reset: () => {
      labClock.current = 0
      set({ playing: false, done: false, time: 0 })
    },
    setTime: (t) => {
      labClock.current = t
      set({ time: t })
    },
    scrub: (t) => {
      labClock.current = t
      set({ time: t, playing: false, done: false })
    },
    finish: () => set({ playing: false, done: true }),
    setSpeed: (speed) => set({ speed }),
    setMetric: (metric) => set({ metric }),
    setActive: (active) => set({ active }),
  })),
)
