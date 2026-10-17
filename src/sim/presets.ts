import type { RocketDesign } from '../../shared/types'

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
  waterFraction: 0.35,
  pressurePsi: 60,
  launchAngleDeg: 80,
}

export function makeDesign(partial: Partial<RocketDesign> = {}): RocketDesign {
  const now = new Date().toISOString()
  return { ...DEFAULT_DESIGN, id: newDesignId(), createdAt: now, updatedAt: now, ...partial }
}

/** Ready-made rockets kids can start from. */
export const SAMPLE_DESIGNS: Omit<RocketDesign, 'id'>[] = [
  {
    ...DEFAULT_DESIGN,
    name: 'Sparky',
    bottleVolumeL: 1,
    dryMassG: 80,
    waterFraction: 0.33,
    pressurePsi: 50,
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
    pressurePsi: 70,
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
    pressurePsi: 65,
    launchAngleDeg: 45,
    bodyColor: '#ff6b6b',
    noseColor: '#ffd93d',
    finColor: '#1e2a4a',
  },
]
