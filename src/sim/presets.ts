import type { RocketDesign, StageSpec } from '../../shared/types'

export const WORKSHOP_WATER_ROCKET = 'water-rocket'

export function newDesignId() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `d_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`
}

export const DEFAULT_DESIGN: RocketDesign = {
  id: 'default',
  name: 'My First Rocket',
  workshop: WORKSHOP_WATER_ROCKET,
  bottleVolumeL: 2,
  dryMassG: 120,
  nozzleDiameterMm: 22,
  noseShape: 'pointy',
  finCount: 3,
  bodyColor: '#4cc9f0',
  noseColor: '#ff6b6b',
  finColor: '#ffd93d',
  boosters: [],
  recovery: 'none',
  parachuteDiameterM: 0.45,
  waterFraction: 0.35,
  pressurePsi: 40,
  launchAngleDeg: 80,
  windMs: 0,
}

/** A sensible booster to add under the current top stage. */
export const DEFAULT_BOOSTER: StageSpec = {
  bottleVolumeL: 2,
  waterFraction: 0.35,
  nozzleDiameterMm: 22,
  dryMassG: 90,
}

export function makeDesign(partial: Partial<RocketDesign> = {}): RocketDesign {
  const now = new Date().toISOString()
  return normalizeDesign({ ...DEFAULT_DESIGN, id: newDesignId(), createdAt: now, updatedAt: now, ...partial })
}

/** Fills in fields added after a design was saved (older browsers / database rows). */
export function normalizeDesign(d: Partial<RocketDesign> & { id: string }): RocketDesign {
  return {
    ...DEFAULT_DESIGN,
    ...d,
    boosters: Array.isArray(d.boosters) ? d.boosters.slice(0, 2).map((b) => ({ ...DEFAULT_BOOSTER, ...b })) : [],
    recovery: d.recovery === 'parachute' ? 'parachute' : 'none',
    parachuteDiameterM: typeof d.parachuteDiameterM === 'number' ? d.parachuteDiameterM : DEFAULT_DESIGN.parachuteDiameterM,
    windMs: typeof d.windMs === 'number' ? d.windMs : 0,
  }
}

/** Ready-made rockets kids can start from. */
export const SAMPLE_DESIGNS: Omit<RocketDesign, 'id'>[] = [
  {
    ...DEFAULT_DESIGN,
    name: 'Sparky',
    bottleVolumeL: 1,
    dryMassG: 80,
    waterFraction: 0.33,
    pressurePsi: 40,
    launchAngleDeg: 85,
    bodyColor: '#ffd93d',
    noseColor: '#845ec2',
    finColor: '#ff6b6b',
  },
  {
    ...DEFAULT_DESIGN,
    name: 'Big Bertha',
    bottleVolumeL: 2,
    dryMassG: 160,
    noseShape: 'round',
    finCount: 4,
    waterFraction: 0.4,
    pressurePsi: 55,
    launchAngleDeg: 75,
    bodyColor: '#6bcb77',
    noseColor: '#1e2a4a',
    finColor: '#4cc9f0',
  },
  {
    ...DEFAULT_DESIGN,
    name: 'Long Shot',
    bottleVolumeL: 1.5,
    dryMassG: 110,
    nozzleDiameterMm: 15,
    waterFraction: 0.3,
    pressurePsi: 50,
    launchAngleDeg: 45,
    bodyColor: '#ff6b6b',
    noseColor: '#ffd93d',
    finColor: '#1e2a4a',
  },
  {
    ...DEFAULT_DESIGN,
    name: 'Soft Lander',
    bottleVolumeL: 2,
    dryMassG: 130,
    recovery: 'parachute',
    parachuteDiameterM: 0.6,
    waterFraction: 0.35,
    pressurePsi: 45,
    launchAngleDeg: 88,
    windMs: 2,
    bodyColor: '#ffffff',
    noseColor: '#ff9f43',
    finColor: '#845ec2',
  },
  {
    ...DEFAULT_DESIGN,
    name: 'Double Trouble',
    bottleVolumeL: 1,
    dryMassG: 90,
    boosters: [{ bottleVolumeL: 2, waterFraction: 0.35, nozzleDiameterMm: 22, dryMassG: 100 }],
    waterFraction: 0.33,
    pressurePsi: 50,
    launchAngleDeg: 88,
    bodyColor: '#845ec2',
    noseColor: '#ffd93d',
    finColor: '#4cc9f0',
  },
]
