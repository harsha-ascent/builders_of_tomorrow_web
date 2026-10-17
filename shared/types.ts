// Types shared between the browser app (src/) and the Cloudflare Pages Functions (functions/, server/).

export type NoseShape = 'pointy' | 'round' | 'flat'
export type FinCount = 3 | 4

/** Everything that describes one rocket + its launcher settings. */
export interface RocketDesign {
  id: string
  name: string
  /** Workshop this design belongs to, e.g. "water-rocket". */
  workshop: string

  // --- The rocket itself ---
  /** Bottle size in litres: 0.5, 1, 1.5 or 2. */
  bottleVolumeL: number
  /** Mass of the empty rocket (bottle + nose + fins + any extra weight) in grams. */
  dryMassG: number
  /** Nozzle opening in millimetres. 22 = open bottle neck, 9 = garden-hose style restrictor. */
  nozzleDiameterMm: number
  noseShape: NoseShape
  finCount: FinCount
  bodyColor: string
  noseColor: string
  finColor: string

  // --- Launcher settings ---
  /** Fraction of the bottle filled with water, 0 to 0.8. */
  waterFraction: number
  /** Pump pressure in psi (gauge). */
  pressurePsi: number
  /** Launch angle from the ground in degrees. 90 = straight up. */
  launchAngleDeg: number

  createdAt?: string
  updatedAt?: string
}

export type FlightPhase = 'ready' | 'thrust' | 'air' | 'coast' | 'landed'

export interface TrajectorySample {
  t: number
  x: number
  y: number
  vx: number
  vy: number
  /** Water left in the bottle as a fraction of bottle volume. */
  water: number
  /** Gauge pressure in kPa. */
  pressureKPa: number
  phase: FlightPhase
}

export interface LaunchResult {
  liftedOff: boolean
  maxHeightM: number
  rangeM: number
  flightTimeS: number
  maxSpeedMs: number
  burnoutSpeedMs: number
  thrustTimeS: number
  maxGs: number
  apogeeTimeS: number
  samples: TrajectorySample[]
}

/** Stored record of one launch (without the heavy trajectory samples). */
export interface LaunchRecord {
  id: string
  designId: string
  designName: string
  settings: Pick<RocketDesign, 'waterFraction' | 'pressurePsi' | 'launchAngleDeg'>
  result: Omit<LaunchResult, 'samples'>
  createdAt: string
}

// --- Worksheets -----------------------------------------------------------

export type WorksheetAnswer = string | string[] | string[][] | number | boolean

export type WorksheetAnswers = Record<string, WorksheetAnswer>

export interface WorksheetProgress {
  workshop: string
  worksheetId: string
  answers: WorksheetAnswers
  updatedAt: string
}

// --- API DTOs --------------------------------------------------------------

export interface MeResponse {
  id: string
  email: string | null
  displayName: string | null
  role: 'student' | 'teacher' | 'parent' | 'admin'
}

export interface FileRecord {
  id: string
  filename: string
  contentType: string
  sizeBytes: number
  url: string
  createdAt: string
}
