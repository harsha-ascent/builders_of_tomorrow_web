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
  /** Pad pressure as a fraction of the setting, 0 (not pumped) to 1 (ready). */
  pump: number
  pumping: boolean
  /** 3, 2, 1 while counting down to lift-off; null otherwise. */
  countdown: number | null
  /** Target-challenge distance in metres, or null for free flight. */
  target: number | null
  play: () => void
  pause: () => void
  /** Back to the pad: rewind and let the air out (a changed design also does this). */
  reset: () => void
  /** Rewind but keep the pump, for "launch again". */
  rewind: () => void
  setTime: (t: number) => void
  /** Jump to a time and stop playing (dragging the time cursor). */
  scrub: (t: number) => void
  finish: () => void
  setSpeed: (s: number) => void
  setMetric: (m: LabMetric) => void
  setActive: (a: LabActive) => void
  setPump: (f: number) => void
  setPumping: (b: boolean) => void
  setCountdown: (n: number | null) => void
  setTarget: (m: number | null) => void
}

export const useLabStore = create<LabState>()(
  subscribeWithSelector((set) => ({
    playing: false,
    time: 0,
    done: false,
    speed: 1,
    metric: 'height',
    active: null,
    pump: 0,
    pumping: false,
    countdown: null,
    target: null,
    play: () =>
      set((s) => {
        const time = s.done ? 0 : s.time
        labClock.current = time
        return { playing: true, done: false, time, countdown: null }
      }),
    pause: () => set({ playing: false }),
    reset: () => {
      labClock.current = 0
      set({ playing: false, done: false, time: 0, pump: 0, pumping: false, countdown: null })
    },
    rewind: () => {
      labClock.current = 0
      set({ playing: false, done: false, time: 0, countdown: null })
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
    setPump: (pump) => set({ pump }),
    setPumping: (pumping) => set({ pumping }),
    setCountdown: (countdown) => set({ countdown }),
    setTarget: (target) => set({ target }),
  })),
)
