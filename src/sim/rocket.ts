/**
 * Water rocket flight simulator.
 *
 * A 2-D model (x = distance along the ground, y = height) with three phases:
 *  1. thrust  – pressurised air pushes water out of the nozzle (Bernoulli + adiabatic air expansion)
 *  2. air     – the leftover compressed air rushes out (choked / unchoked nozzle flow)
 *  3. coast   – ballistic flight with aerodynamic drag until the rocket lands
 *
 * Numbers are deliberately kept in SI units inside this file. The UI converts
 * to kid-friendly units (psi, litres, grams) at the edges.
 */
import type { FlightPhase, LaunchResult, NoseShape, RocketDesign, TrajectorySample } from '../../shared/types'

export const PHYS = {
  g: 9.81, // m/s²
  rhoWater: 1000, // kg/m³
  rhoAir: 1.225, // kg/m³ (outside air)
  pAtm: 101_325, // Pa
  gamma: 1.4, // adiabatic index of air
  rAir: 287, // J/(kg·K)
  tempK: 293, // ~20 °C
  speedOfSound: 343, // m/s
} as const

export interface BottleSpec {
  volumeL: number
  label: string
  diameterM: number
  heightM: number
  /** Mass of just the empty bottle, used to suggest a sensible dry mass. */
  bottleMassG: number
}

export const BOTTLES: BottleSpec[] = [
  { volumeL: 0.5, label: 'Small (500 ml)', diameterM: 0.066, heightM: 0.21, bottleMassG: 20 },
  { volumeL: 1, label: 'Medium (1 L)', diameterM: 0.08, heightM: 0.26, bottleMassG: 30 },
  { volumeL: 1.5, label: 'Large (1.5 L)', diameterM: 0.09, heightM: 0.3, bottleMassG: 38 },
  { volumeL: 2, label: 'Jumbo (2 L)', diameterM: 0.105, heightM: 0.33, bottleMassG: 45 },
]

export function bottleSpec(volumeL: number): BottleSpec {
  return BOTTLES.find((b) => Math.abs(b.volumeL - volumeL) < 1e-6) ?? BOTTLES[3]
}

/**
 * Drag coefficients for a kid-built rocket. Textbook streamlined shapes reach 0.3; real bottle rockets with
 * taped-on fins measure closer to 0.35-0.5, so these are deliberately not the theoretical best.
 */
export const NOSE_CD: Record<NoseShape, number> = {
  pointy: 0.4,
  round: 0.5,
  flat: 0.85,
}

/** Nozzle discharge coefficient: real necks squeeze the jet a little (0.8 ragged … 0.98 smooth). */
export const NOZZLE_DISCHARGE = 0.95

/** Real-world pressure guidance (psi, gauge) shown next to every pressure control. */
export const SAFETY = {
  /** Typical limit for school and family launches. */
  schoolMaxPsi: 40,
  /** Only with an adult, a launch cord and everyone 10 m back. */
  supervisedMaxPsi: 60,
  /** Common competition cap for 2 L drinks bottles. */
  competitionMaxPsi: 75,
  /** New fizzy-drink bottles burst somewhere around here; scratches, heat and age lower it a lot. */
  typicalBurstPsi: 150,
} as const

export type PressureZone = 'green' | 'amber' | 'red'

export function pressureZone(psi: number): { zone: PressureZone; label: string; advice: string } {
  if (psi <= SAFETY.schoolMaxPsi) {
    return { zone: 'green', label: 'School-safe', advice: `Up to ${SAFETY.schoolMaxPsi} psi is what most school launches use.` }
  }
  if (psi <= SAFETY.supervisedMaxPsi) {
    return {
      zone: 'amber',
      label: 'Adult + launch cord',
      advice: `${SAFETY.schoolMaxPsi}–${SAFETY.supervisedMaxPsi} psi: only with a grown-up, a launch cord and everyone 10 big steps back.`,
    }
  }
  return {
    zone: 'red',
    label: 'Simulator only',
    advice: `Above ${SAFETY.supervisedMaxPsi} psi is for competition rockets with inspected bottles. Great to explore here, not in the garden.`,
  }
}

export const NOZZLES = [
  { diameterMm: 22, label: 'Open neck (22 mm)', hint: 'Big push, very short burst' },
  { diameterMm: 15, label: 'Medium (15 mm)', hint: 'Balanced' },
  { diameterMm: 9, label: 'Narrow (9 mm)', hint: 'Gentle push, longer burn' },
]

export const LIMITS = {
  waterFraction: { min: 0, max: 0.8, step: 0.05 },
  pressurePsi: { min: 10, max: 80, step: 5 },
  launchAngleDeg: { min: 20, max: 90, step: 5 },
  dryMassG: { min: 30, max: 400, step: 10 },
} as const

export const psiToPa = (psi: number) => psi * 6894.757
export const paToPsi = (pa: number) => pa / 6894.757

/** Drag coefficient: nose shape sets most of it, extra fins add a little. */
export function dragCoefficient(d: Pick<RocketDesign, 'noseShape' | 'finCount'>): number {
  return NOSE_CD[d.noseShape] + (d.finCount - 3) * 0.03
}

export interface SimOptions {
  /** Integration time step in seconds. */
  dt?: number
  /** How often to record a trajectory sample, in seconds. */
  sampleIntervalS?: number
  /** Give up after this many seconds of flight. */
  maxTimeS?: number
  /** Height of the rocket's starting point above the ground. */
  launcherHeightM?: number
  /** Length of the launch guide; the rocket keeps the launch angle while on it. */
  guideLengthM?: number
}

export function simulateLaunch(design: RocketDesign, opts: SimOptions = {}): LaunchResult {
  const dt = opts.dt ?? 0.0005
  const sampleInterval = opts.sampleIntervalS ?? 0.01
  const maxTime = opts.maxTimeS ?? 90
  const y0 = opts.launcherHeightM ?? 0.4
  const guideLength = opts.guideLengthM ?? 0.3

  const { g, rhoWater, rhoAir, pAtm, gamma, rAir, tempK, speedOfSound } = PHYS
  const spec = bottleSpec(design.bottleVolumeL)

  const V = design.bottleVolumeL / 1000 // m³
  const waterFraction = clamp(design.waterFraction, 0, 0.95)
  let Vw = waterFraction * V
  const Va0 = Math.max(V - Vw, 1e-6)
  const p0 = pAtm + psiToPa(clamp(design.pressurePsi, 0, 200))
  const An = NOZZLE_DISCHARGE * Math.PI * (design.nozzleDiameterMm / 2000) ** 2 // effective nozzle area m²
  const Af = Math.PI * (spec.diameterM / 2) ** 2 // frontal area m²
  const Cd = dragCoefficient(design)
  const mDry = clamp(design.dryMassG, 1, 5000) / 1000

  const theta = (clamp(design.launchAngleDeg, 1, 90) * Math.PI) / 180
  const axis = { x: Math.cos(theta), y: Math.sin(theta) }

  let x = 0
  let y = y0
  let vx = 0
  let vy = 0
  let t = 0
  let phase: FlightPhase = 'thrust'
  let mAir = (p0 * Va0) / (rAir * tempK) // kg of air in the bottle
  // The air cools as it expands (adiabatic). Once the water is gone it keeps roughly this temperature.
  let tAir = tempK
  let pressure = p0
  let liftedOff = false

  let maxHeight = y0
  let apogeeTime = 0
  let maxSpeed = 0
  let burnoutSpeed = 0
  let thrustEndTime = 0
  let maxAccel = 0

  const samples: TrajectorySample[] = []
  let nextSample = 0

  const record = (ph: FlightPhase) => {
    samples.push({
      t,
      x,
      y: Math.max(y, 0),
      vx,
      vy,
      water: Vw / V,
      pressureKPa: Math.max(pressure - pAtm, 0) / 1000,
      phase: ph,
    })
  }

  record('ready')
  nextSample = sampleInterval

  while (t < maxTime) {
    const m = mDry + rhoWater * Vw
    const speed = Math.hypot(vx, vy)
    const travelled = Math.hypot(x, y - y0)

    // While on the launch guide the rocket points along the launch angle; after that it flies nose-first.
    const onGuide = travelled < guideLength
    const dir = onGuide || speed < 0.5 ? axis : { x: vx / speed, y: vy / speed }

    // ---- Thrust ---------------------------------------------------------
    let thrust = 0
    if (phase === 'thrust') {
      const Va = V - Vw
      pressure = p0 * (Va0 / Va) ** gamma
      if (Vw <= 1e-9) {
        // Water is gone; whatever air is left now rushes out, having cooled while it expanded.
        Vw = 0
        tAir = tempK * (Va0 / V) ** (gamma - 1)
        mAir = (pressure * V) / (rAir * tAir)
        phase = 'air'
      } else if (pressure <= pAtm) {
        phase = 'coast'
      } else {
        const ve = Math.sqrt((2 * (pressure - pAtm)) / rhoWater)
        thrust = 2 * An * (pressure - pAtm) // = rhoWater * An * ve²
        Vw = Math.max(Vw - An * ve * dt, 0)
      }
    }
    if (phase === 'air') {
      const rhoIn = mAir / V
      pressure = rhoIn * rAir * tAir
      const ratio = pressure / pAtm
      if (ratio <= 1.002 || mAir <= 0) {
        phase = 'coast'
        pressure = pAtm
        burnoutSpeed = speed
        thrustEndTime = t
      } else {
        let mdot: number
        let ve: number
        let pExit = pAtm
        if (ratio > 1.893) {
          // Choked flow: the nozzle is at the speed of sound.
          const k = gamma
          mdot = An * pressure * Math.sqrt(k / (rAir * tAir)) * (2 / (k + 1)) ** ((k + 1) / (2 * (k - 1)))
          const tStar = (tAir * 2) / (k + 1)
          ve = Math.sqrt(k * rAir * tStar)
          pExit = pressure * (2 / (k + 1)) ** (k / (k - 1))
        } else {
          ve = Math.min(Math.sqrt((2 * (pressure - pAtm)) / rhoIn), speedOfSound)
          mdot = rhoIn * An * ve
        }
        thrust = mdot * ve + (pExit - pAtm) * An
        mAir = Math.max(mAir - mdot * dt, 0)
      }
    }
    // ---- Forces -----------------------------------------------------------
    const drag = 0.5 * rhoAir * Cd * Af * speed * speed
    const dragX = speed > 0 ? (-drag * vx) / speed : 0
    const dragY = speed > 0 ? (-drag * vy) / speed : 0

    let ax = (thrust * dir.x + dragX) / m
    let ay = (thrust * dir.y + dragY) / m - g

    if (!liftedOff) {
      // The launcher holds the rocket until thrust beats gravity along the guide.
      const alongGuide = ax * axis.x + ay * axis.y
      if (alongGuide <= 0) {
        ax = 0
        ay = 0
        vx = 0
        vy = 0
        if (phase === 'coast') break // never going to fly
      } else {
        liftedOff = true
      }
    }

    maxAccel = Math.max(maxAccel, Math.hypot(ax, ay + g))

    // Semi-implicit Euler keeps this stable with a tiny step.
    vx += ax * dt
    vy += ay * dt
    x += vx * dt
    y += vy * dt
    t += dt

    const newSpeed = Math.hypot(vx, vy)
    maxSpeed = Math.max(maxSpeed, newSpeed)
    if (y > maxHeight) {
      maxHeight = y
      apogeeTime = t
    }

    if (liftedOff && y <= 0 && vy < 0) {
      y = 0
      phase = 'landed'
      record('landed')
      break
    }

    if (t >= nextSample) {
      record(phase)
      nextSample += sampleInterval
    }
  }

  if (!liftedOff) {
    return {
      liftedOff: false,
      maxHeightM: 0,
      rangeM: 0,
      flightTimeS: 0,
      maxSpeedMs: 0,
      burnoutSpeedMs: 0,
      thrustTimeS: 0,
      maxGs: 0,
      apogeeTimeS: 0,
      samples,
    }
  }

  return {
    liftedOff: true,
    maxHeightM: round(maxHeight - y0, 2),
    rangeM: round(x, 2),
    flightTimeS: round(t, 2),
    maxSpeedMs: round(maxSpeed, 2),
    burnoutSpeedMs: round(burnoutSpeed || maxSpeed, 2),
    thrustTimeS: round(thrustEndTime, 3),
    maxGs: round(maxAccel / g, 1),
    apogeeTimeS: round(apogeeTime, 2),
    samples,
  }
}

/** Quick summary without the trajectory, for live read-outs while designing. */
export function quickStats(design: RocketDesign) {
  const r = simulateLaunch(design, { sampleIntervalS: 1 })
  return {
    liftedOff: r.liftedOff,
    maxHeightM: r.maxHeightM,
    rangeM: r.rangeM,
    flightTimeS: r.flightTimeS,
    maxSpeedMs: r.maxSpeedMs,
  }
}

/** Run the sim across a range of one setting, for charts. */
export function sweep<K extends 'waterFraction' | 'pressurePsi' | 'launchAngleDeg'>(
  design: RocketDesign,
  key: K,
  values: number[],
): { value: number; maxHeightM: number; rangeM: number }[] {
  return values.map((value) => {
    const r = simulateLaunch({ ...design, [key]: value }, { sampleIntervalS: 1 })
    return { value, maxHeightM: r.maxHeightM, rangeM: r.rangeM }
  })
}

/** Linear interpolation into the trajectory for smooth animation. */
export function sampleAt(samples: TrajectorySample[], t: number): TrajectorySample {
  if (samples.length === 0) {
    return { t: 0, x: 0, y: 0, vx: 0, vy: 0, water: 0, pressureKPa: 0, phase: 'ready' }
  }
  if (t <= samples[0].t) return samples[0]
  const last = samples[samples.length - 1]
  if (t >= last.t) return last
  // Binary search for the surrounding samples.
  let lo = 0
  let hi = samples.length - 1
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1
    if (samples[mid].t <= t) lo = mid
    else hi = mid
  }
  const a = samples[lo]
  const b = samples[hi]
  const f = (t - a.t) / Math.max(b.t - a.t, 1e-9)
  return {
    t,
    x: a.x + (b.x - a.x) * f,
    y: a.y + (b.y - a.y) * f,
    vx: a.vx + (b.vx - a.vx) * f,
    vy: a.vy + (b.vy - a.vy) * f,
    water: a.water + (b.water - a.water) * f,
    pressureKPa: a.pressureKPa + (b.pressureKPa - a.pressureKPa) * f,
    phase: a.phase,
  }
}

export function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v))
}

function round(v: number, digits: number) {
  const p = 10 ** digits
  return Math.round(v * p) / p
}
