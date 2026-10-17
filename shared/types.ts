// Types shared between the browser app (src/) and the Cloudflare Pages Functions (functions/, server/).

export type NoseShape = 'pointy' | 'round' | 'flat'
export type FinCount = 3 | 4
export type RecoveryMode = 'none' | 'parachute'

/** One booster stage below the top (nose) stage. */
export interface StageSpec {
  bottleVolumeL: number
  waterFraction: number
  nozzleDiameterMm: number
  /** Empty mass of this stage: bottle, fins, coupler. */
  dryMassG: number
}

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

  /** Lower stages, bottom (fires first) to top. Empty = single-stage rocket. Max 2. */
  boosters: StageSpec[]
  recovery: RecoveryMode
  /** Flat canopy diameter in metres when recovery = 'parachute'. */
  parachuteDiameterM: number

  // --- Launcher settings ---
  /** Fraction of the bottle filled with water, 0 to 0.8. */
  waterFraction: number
  /** Pump pressure in psi (gauge). All stages share it. */
  pressurePsi: number
  /** Launch angle from the ground in degrees. 90 = straight up. */
  launchAngleDeg: number
  /** Steady wind along the flight direction in m/s. Positive blows the same way the rocket flies. */
  windMs: number

  createdAt?: string
  updatedAt?: string
}

export type FlightPhase = 'ready' | 'thrust' | 'air' | 'coast' | 'parachute' | 'landed'

export interface TrajectorySample {
  t: number
  x: number
  y: number
  vx: number
  vy: number
  /** Water left in the currently firing stage as a fraction of its bottle volume. */
  water: number
  /** Gauge pressure in the firing stage, kPa. */
  pressureKPa: number
  phase: FlightPhase
  /** How many stages are still attached (1 = only the top stage). */
  attached: number
  /** Parachute inflation 0-1. */
  chute: number
}

export interface FlightEvent {
  type: 'liftoff' | 'stage-separation' | 'burnout' | 'apogee' | 'parachute' | 'landed'
  t: number
  x: number
  y: number
  vx: number
  vy: number
  /** For stage-separation: index of the stage that dropped away (0 = bottom booster). */
  stage?: number
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
  /** Speed when the rocket hits the ground. */
  landingSpeedMs: number
  /** True when the landing speed is gentle enough for the rocket to fly again. */
  safeLanding: boolean
  /** Seconds from apogee to landing. */
  descentTimeS: number
  parachuteDeployedAtS: number | null
  stageSeparationsS: number[]
  stageCount: number
  events: FlightEvent[]
  samples: TrajectorySample[]
}

/** Stored record of one launch (without the heavy trajectory samples). */
export interface LaunchRecord {
  id: string
  workshop?: string
  designId: string
  designName: string
  settings: Pick<RocketDesign, 'waterFraction' | 'pressurePsi' | 'launchAngleDeg'> & { windMs?: number; stages?: number; recovery?: RecoveryMode }
  result: Omit<LaunchResult, 'samples' | 'events'>
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
  digestOptIn: boolean
  lastDigestAt: string | null
}

/** A workshop the learner has joined. */
export interface Enrollment {
  workshop: string
  createdAt: string
}

/** One week of a learner's activity, as summarised in the weekly email. */
export interface DigestStats {
  since: string
  until: string
  rockets: { designsTouched: number; launches: number; bestHeightM: number | null; softLandings: number }
  bridges: { designsTouched: number; tests: number; bestLoadKg: number | null }
  worksheetsTouched: number
  hasActivity: boolean
}

export interface FileRecord {
  id: string
  filename: string
  contentType: string
  sizeBytes: number
  url: string
  createdAt: string
}

// --- Bridge Builder ---------------------------------------------------------

export type MaterialId = 'stick' | 'straw' | 'spaghetti' | 'balsa'
export type LoadMode = 'center' | 'truck'

/** A joint. Coordinates are in centimetres on the design grid; y = 0 is the road deck. */
export interface BridgeNode {
  id: string
  x: number
  y: number
}

/** A straight piece of material glued between two joints. */
export interface BridgeMember {
  id: string
  a: string
  b: string
  material: MaterialId
  /** Pieces glued face-to-face to make a thicker member (1-3). Thicker = much harder to buckle. */
  layers?: number
}

/** Fields every saved design shares, whatever the workshop. */
export interface DesignBase {
  id: string
  name: string
  workshop: string
  createdAt?: string
  updatedAt?: string
}

/** One saved test (a rocket launch, a bridge load test, ...). */
export interface TestRecordBase {
  id: string
  workshop?: string
  designId: string
  designName: string
  settings: Record<string, unknown>
  result: Record<string, unknown>
  createdAt: string
}

export interface BridgeDesign {
  id: string
  name: string
  workshop: string
  nodes: BridgeNode[]
  members: BridgeMember[]
  /** Where the test weight goes: a bucket at mid-span, or a toy truck driven across. */
  loadMode: LoadMode
  /** Coins the builder may spend. */
  budget: number
  createdAt?: string
  updatedAt?: string
}

export type FailureMode = 'tension' | 'buckling' | 'crush' | 'self-weight'

export interface MemberResult {
  id: string
  lengthCm: number
  /** Force at the breaking load; + tension, − compression (newtons). */
  forceN: number
  tensionLimitN: number
  compressionLimitN: number
  /** |force| / limit at the breaking load, 0-1 (the first to break is 1). */
  utilization: number
}

export type BridgeProblem = 'no-deck' | 'dangling' | 'mechanism' | 'disconnected' | 'too-long' | 'empty'

export interface BridgeAnalysis {
  ok: boolean
  problem?: BridgeProblem
  message: string
  /** Maximum test load before the first member fails, in newtons and kilograms. */
  capacityN: number
  capacityKg: number
  firstToBreak: string | null
  failureMode: FailureMode | null
  /** For truck mode: where along the deck (cm) the worst case happened. */
  worstLoadX: number
  members: MemberResult[]
  /** Node displacements at the breaking load, in millimetres. */
  displacementsMm: Record<string, { dx: number; dy: number }>
  maxDeflectionMm: number
  massG: number
  costCoins: number
  /** Contest score: how many times its own weight the bridge holds. */
  efficiency: number
  /** Node ids that are not connected to the supports. */
  floatingNodes: string[]
  /** Member ids longer than their material allows. */
  tooLongMembers: string[]
}

export interface BridgeTestRecord {
  id: string
  workshop?: string
  designId: string
  designName: string
  settings: { loadMode: LoadMode; members: number; massG: number; costCoins: number }
  result: Pick<BridgeAnalysis, 'ok' | 'capacityKg' | 'failureMode' | 'maxDeflectionMm' | 'efficiency' | 'worstLoadX'> & { firstToBreak: string | null }
  createdAt: string
}
