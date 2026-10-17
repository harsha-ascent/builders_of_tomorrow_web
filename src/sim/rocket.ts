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
import type { FlightEvent, FlightPhase, LaunchResult, NoseShape, RocketDesign, StageSpec, TrajectorySample } from '../../shared/types'

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

/** Parachute model: a flat plastic canopy that pops out when the nose falls off at apogee. */
export const CHUTE = {
  /** Drag coefficient referenced to the flat (nominal) canopy area. */
  cd: 0.75,
  /** Canopy + lines mass per square metre of nominal area (thin plastic). */
  massPerM2Kg: 0.06,
  /** Nose-cone catch, swivel and string. */
  hardwareKg: 0.01,
  /** Seconds after apogee before the nose lets go. */
  deployDelayS: 0.3,
  /** Seconds for the canopy to inflate fully. */
  inflateS: 0.5,
} as const

/** Landing at or below this speed counts as "soft": the rocket can fly again. */
export const SAFE_LANDING_MS = 7

export const STAGING = {
  /** Extra drag per attached booster (couplers, extra fins). */
  cdPerBooster: 0.05,
  maxBoosters: 2,
} as const

export function parachuteAreaM2(diameterM: number) {
  return Math.PI * (diameterM / 2) ** 2
}

export function parachuteMassKg(design: Pick<RocketDesign, 'recovery' | 'parachuteDiameterM'>) {
  if (design.recovery !== 'parachute') return 0
  return CHUTE.hardwareKg + CHUTE.massPerM2Kg * parachuteAreaM2(design.parachuteDiameterM)
}

/** All stages bottom-first; the last one is the top stage carrying the nose (and parachute). */
export function stageList(design: RocketDesign): StageSpec[] {
  const top: StageSpec = {
    bottleVolumeL: design.bottleVolumeL,
    waterFraction: design.waterFraction,
    nozzleDiameterMm: design.nozzleDiameterMm,
    dryMassG: design.dryMassG + parachuteMassKg(design) * 1000,
  }
  return [...(design.boosters ?? []).slice(0, STAGING.maxBoosters), top]
}

/** Empty mass of the whole stack in grams (including the parachute). */
export function totalDryMassG(design: RocketDesign) {
  return stageList(design).reduce((m, s) => m + s.dryMassG, 0)
}

/** Steady fall speed of the empty top stage, with or without its parachute. */
export function terminalVelocity(design: RocketDesign): number {
  const { g, rhoAir } = PHYS
  const spec = bottleSpec(design.bottleVolumeL)
  const m = design.dryMassG / 1000 + parachuteMassKg(design)
  const Af = Math.PI * (spec.diameterM / 2) ** 2
  let cdA = dragCoefficient(design) * Af
  if (design.recovery === 'parachute') cdA += CHUTE.cd * parachuteAreaM2(design.parachuteDiameterM)
  return Math.sqrt((2 * m * g) / (rhoAir * cdA))
}

interface StageState {
  V: number
  Vw: number
  Va0: number
  An: number
  mDry: number
  diameter: number
  pressure: number
  mAir: number
  tAir: number
  phase: 'thrust' | 'air' | 'done'
}

export function simulateLaunch(design: RocketDesign, opts: SimOptions = {}): LaunchResult {
  const dt = opts.dt ?? 0.0005
  const sampleInterval = opts.sampleIntervalS ?? 0.01
  const maxTime = opts.maxTimeS ?? 120
  const y0 = opts.launcherHeightM ?? 0.4
  const guideLength = opts.guideLengthM ?? 0.3

  const { g, rhoWater, rhoAir, pAtm, gamma, rAir, tempK, speedOfSound } = PHYS
  const p0 = pAtm + psiToPa(clamp(design.pressurePsi, 0, 200))
  const wind = clamp(design.windMs ?? 0, -15, 15)

  const stages: StageState[] = stageList(design).map((sp) => {
    const V = sp.bottleVolumeL / 1000
    const Vw = clamp(sp.waterFraction, 0, 0.95) * V
    return {
      V,
      Vw,
      Va0: Math.max(V - Vw, 1e-6),
      An: NOZZLE_DISCHARGE * Math.PI * (sp.nozzleDiameterMm / 2000) ** 2,
      mDry: clamp(sp.dryMassG, 1, 5000) / 1000,
      diameter: bottleSpec(sp.bottleVolumeL).diameterM,
      pressure: p0,
      mAir: (p0 * Math.max(V - Vw, 1e-6)) / (rAir * tempK),
      tAir: tempK,
      phase: 'thrust',
    }
  })
  const nStages = stages.length
  let cur = 0

  const baseCd = dragCoefficient(design)
  const hasChute = design.recovery === 'parachute'
  const chuteCdA = hasChute ? CHUTE.cd * parachuteAreaM2(design.parachuteDiameterM) : 0

  const theta = (clamp(design.launchAngleDeg, 1, 90) * Math.PI) / 180
  const axis = { x: Math.cos(theta), y: Math.sin(theta) }

  let x = 0
  let y = y0
  let vx = 0
  let vy = 0
  let t = 0
  let liftedOff = false
  let burnedOut = false
  let apogeeReached = false
  let apogeeT = 0
  let chute = 0
  let deployT: number | null = null
  let phase: FlightPhase = 'thrust'

  let maxHeight = y0
  let maxHeightT = 0
  let maxSpeed = 0
  let burnoutSpeed = 0
  let thrustEndTime = 0
  let maxAccel = 0
  let landingSpeed = 0
  const events: FlightEvent[] = []
  const separations: number[] = []

  const samples: TrajectorySample[] = []
  let nextSample = 0
  const record = (ph: FlightPhase) => {
    const s = stages[Math.min(cur, nStages - 1)]
    samples.push({
      t,
      x,
      y: Math.max(y, 0),
      vx,
      vy,
      water: s.Vw / s.V,
      pressureKPa: Math.max(s.pressure - pAtm, 0) / 1000,
      phase: ph,
      attached: nStages - Math.min(cur, nStages - 1),
      chute,
    })
  }
  const event = (type: FlightEvent['type'], stage?: number) => {
    events.push({ type, t, x, y: Math.max(y, 0), vx, vy, ...(stage !== undefined ? { stage } : {}) })
  }

  record('ready')
  nextSample = sampleInterval

  while (t < maxTime) {
    // ---- Mass and geometry of what is still attached --------------------
    // The top stage is always attached, even after it has burned out.
    const attachedFrom = Math.min(cur, nStages - 1)
    let m = 0
    let maxD = 0
    for (let i = attachedFrom; i < nStages; i++) {
      m += stages[i].mDry + rhoWater * stages[i].Vw
      maxD = Math.max(maxD, stages[i].diameter)
    }
    const Af = Math.PI * (maxD / 2) ** 2
    const Cd = baseCd + STAGING.cdPerBooster * (nStages - attachedFrom - 1)

    const speed = Math.hypot(vx, vy)
    const travelled = Math.hypot(x, y - y0)
    const onGuide = travelled < guideLength
    const dir = onGuide || speed < 0.5 ? axis : { x: vx / speed, y: vy / speed }

    // ---- Thrust from the current stage -----------------------------------
    let thrust = 0
    if (cur < nStages) {
      const s = stages[cur]
      if (s.phase === 'thrust') {
        const Va = s.V - s.Vw
        s.pressure = p0 * (s.Va0 / Va) ** gamma
        if (s.Vw <= 1e-9) {
          s.Vw = 0
          s.tAir = tempK * (s.Va0 / s.V) ** (gamma - 1)
          s.mAir = (s.pressure * s.V) / (rAir * s.tAir)
          s.phase = 'air'
        } else if (s.pressure <= pAtm) {
          s.phase = 'done'
        } else {
          const ve = Math.sqrt((2 * (s.pressure - pAtm)) / rhoWater)
          thrust = 2 * s.An * (s.pressure - pAtm)
          s.Vw = Math.max(s.Vw - s.An * ve * dt, 0)
        }
      }
      if (s.phase === 'air') {
        const rhoIn = s.mAir / s.V
        s.pressure = rhoIn * rAir * s.tAir
        const ratio = s.pressure / pAtm
        if (ratio <= 1.002 || s.mAir <= 0) {
          s.phase = 'done'
          s.pressure = pAtm
        } else {
          let mdot: number
          let ve: number
          let pExit = pAtm
          if (ratio > 1.893) {
            const k = gamma
            mdot = s.An * s.pressure * Math.sqrt(k / (rAir * s.tAir)) * (2 / (k + 1)) ** ((k + 1) / (2 * (k - 1)))
            const tStar = (s.tAir * 2) / (k + 1)
            ve = Math.sqrt(k * rAir * tStar)
            pExit = s.pressure * (2 / (k + 1)) ** (k / (k - 1))
          } else {
            ve = Math.min(Math.sqrt((2 * (s.pressure - pAtm)) / rhoIn), speedOfSound)
            mdot = rhoIn * s.An * ve
          }
          thrust = mdot * ve + (pExit - pAtm) * s.An
          s.mAir = Math.max(s.mAir - mdot * dt, 0)
        }
      }
      if (s.phase === 'done') {
        if (!liftedOff) break // the bottom stage could not even lift the stack
        if (cur < nStages - 1) {
          event('stage-separation', cur)
          separations.push(t)
          cur++
          phase = 'thrust'
        } else {
          cur = nStages
          burnedOut = true
          burnoutSpeed = speed
          thrustEndTime = t
          event('burnout')
          phase = 'coast'
        }
      } else {
        phase = s.phase
      }
    }

    // ---- Parachute --------------------------------------------------------
    if (hasChute && apogeeReached && deployT !== null && t >= deployT) {
      const newChute = Math.min(1, (t - deployT) / CHUTE.inflateS)
      if (chute === 0 && newChute > 0) event('parachute')
      chute = newChute
      phase = 'parachute'
    }

    // ---- Forces -----------------------------------------------------------
    const relVx = vx - wind
    const relSpeed = Math.hypot(relVx, vy)
    const cdA = Cd * Af + chute * chuteCdA
    const drag = 0.5 * rhoAir * cdA * relSpeed * relSpeed
    const dragX = relSpeed > 0 ? (-drag * relVx) / relSpeed : 0
    const dragY = relSpeed > 0 ? (-drag * vy) / relSpeed : 0

    let ax = (thrust * dir.x + dragX) / m
    let ay = (thrust * dir.y + dragY) / m - g

    if (!liftedOff) {
      const alongGuide = ax * axis.x + ay * axis.y
      if (alongGuide <= 0) {
        ax = 0
        ay = 0
        vx = 0
        vy = 0
      } else {
        liftedOff = true
        event('liftoff')
      }
    }

    maxAccel = Math.max(maxAccel, Math.hypot(ax, ay + g))

    vx += ax * dt
    vy += ay * dt
    x += vx * dt
    y += vy * dt
    t += dt

    const newSpeed = Math.hypot(vx, vy)
    maxSpeed = Math.max(maxSpeed, newSpeed)
    if (y > maxHeight) {
      maxHeight = y
      maxHeightT = t
    }
    if (liftedOff && burnedOut && !apogeeReached && vy < 0) {
      apogeeReached = true
      apogeeT = t
      event('apogee')
      if (hasChute) deployT = t + CHUTE.deployDelayS
    }

    if (liftedOff && y <= 0 && vy < 0) {
      y = 0
      landingSpeed = newSpeed
      phase = 'landed'
      event('landed')
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
      landingSpeedMs: 0,
      safeLanding: false,
      descentTimeS: 0,
      parachuteDeployedAtS: null,
      stageSeparationsS: [],
      stageCount: nStages,
      events,
      samples,
    }
  }

  const chuteEvent = events.find((e) => e.type === 'parachute')
  return {
    liftedOff: true,
    maxHeightM: round(maxHeight - y0, 2),
    rangeM: round(x, 2),
    flightTimeS: round(t, 2),
    maxSpeedMs: round(maxSpeed, 2),
    burnoutSpeedMs: round(burnoutSpeed || maxSpeed, 2),
    thrustTimeS: round(thrustEndTime, 3),
    maxGs: round(maxAccel / g, 1),
    apogeeTimeS: round(apogeeT || maxHeightT, 2),
    landingSpeedMs: round(landingSpeed, 2),
    safeLanding: landingSpeed <= SAFE_LANDING_MS,
    descentTimeS: round(t - (apogeeT || maxHeightT), 2),
    parachuteDeployedAtS: chuteEvent ? round(chuteEvent.t, 2) : null,
    stageSeparationsS: separations.map((v) => round(v, 3)),
    stageCount: nStages,
    events,
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
    landingSpeedMs: r.landingSpeedMs,
    safeLanding: r.safeLanding,
  }
}

export type SweepKey = 'waterFraction' | 'pressurePsi' | 'launchAngleDeg' | 'parachuteDiameterM' | 'windMs' | 'dryMassG'

/** Run the sim across a range of one setting, for charts. */
export function sweep(
  design: RocketDesign,
  key: SweepKey,
  values: number[],
): { value: number; maxHeightM: number; rangeM: number; landingSpeedMs: number; flightTimeS: number }[] {
  return values.map((value) => {
    const r = simulateLaunch({ ...design, [key]: value }, { sampleIntervalS: 1 })
    return { value, maxHeightM: r.maxHeightM, rangeM: r.rangeM, landingSpeedMs: r.landingSpeedMs, flightTimeS: r.flightTimeS }
  })
}

/** Linear interpolation into the trajectory for smooth animation. */
export function sampleAt(samples: TrajectorySample[], t: number): TrajectorySample {
  if (samples.length === 0) {
    return { t: 0, x: 0, y: 0, vx: 0, vy: 0, water: 0, pressureKPa: 0, phase: 'ready', attached: 1, chute: 0 }
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
    attached: Math.min(a.attached, b.attached),
    chute: a.chute + (b.chute - a.chute) * f,
  }
}

export function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v))
}

function round(v: number, digits: number) {
  const p = 10 ** digits
  return Math.round(v * p) / p
}
