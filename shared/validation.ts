import { z } from 'zod'

const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Colour must look like #rrggbb')

export const stageSpecSchema = z.object({
  bottleVolumeL: z.number().min(0.25).max(3),
  waterFraction: z.number().min(0).max(0.95),
  nozzleDiameterMm: z.number().min(3).max(30),
  dryMassG: z.number().min(1).max(5000),
})

export const rocketDesignSchema = z.object({
  id: z.string().min(1).max(64),
  name: z.string().trim().min(1).max(60),
  workshop: z.string().min(1).max(40),
  bottleVolumeL: z.number().min(0.25).max(3),
  dryMassG: z.number().min(1).max(5000),
  nozzleDiameterMm: z.number().min(3).max(30),
  noseShape: z.enum(['pointy', 'round', 'flat']),
  finCount: z.union([z.literal(3), z.literal(4)]),
  bodyColor: hexColor,
  noseColor: hexColor,
  finColor: hexColor,
  boosters: z.array(stageSpecSchema).max(2).default([]),
  recovery: z.enum(['none', 'parachute']).default('none'),
  parachuteDiameterM: z.number().min(0.1).max(2).default(0.45),
  waterFraction: z.number().min(0).max(0.95),
  pressurePsi: z.number().min(0).max(200),
  launchAngleDeg: z.number().min(1).max(90),
  windMs: z.number().min(-10).max(10).default(0),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
})

export const launchResultSummarySchema = z.object({
  liftedOff: z.boolean(),
  maxHeightM: z.number(),
  rangeM: z.number(),
  flightTimeS: z.number(),
  maxSpeedMs: z.number(),
  burnoutSpeedMs: z.number(),
  thrustTimeS: z.number(),
  maxGs: z.number(),
  apogeeTimeS: z.number(),
  landingSpeedMs: z.number().default(0),
  safeLanding: z.boolean().default(false),
  descentTimeS: z.number().default(0),
  parachuteDeployedAtS: z.number().nullable().default(null),
  stageSeparationsS: z.array(z.number()).default([]),
  stageCount: z.number().int().min(1).max(3).default(1),
})

export const launchRecordSchema = z.object({
  id: z.string().min(1).max(64),
  designId: z.string().min(1).max(64),
  designName: z.string().max(60),
  settings: z.object({
    waterFraction: z.number(),
    pressurePsi: z.number(),
    launchAngleDeg: z.number(),
    windMs: z.number().optional(),
    stages: z.number().optional(),
    recovery: z.enum(['none', 'parachute']).optional(),
  }),
  result: launchResultSummarySchema,
  createdAt: z.string(),
})

export const worksheetAnswersSchema = z.record(
  z.string().max(40),
  z.union([
    z.string().max(4000),
    z.number(),
    z.boolean(),
    z.array(z.string().max(500)).max(60),
    z.array(z.array(z.string().max(500)).max(20)).max(60),
  ]),
)

export const shareRequestSchema = z.object({
  to: z.email(),
  note: z.string().max(500).optional(),
  launch: launchRecordSchema,
})


// --- Bridge Builder ---------------------------------------------------------

export const bridgeNodeSchema = z.object({
  id: z.string().min(1).max(40),
  x: z.number().min(-20).max(80),
  y: z.number().min(-40).max(40),
})

export const bridgeMemberSchema = z.object({
  id: z.string().min(1).max(40),
  a: z.string().min(1).max(40),
  b: z.string().min(1).max(40),
  material: z.enum(['stick', 'straw', 'spaghetti', 'balsa']),
  layers: z.number().int().min(1).max(3).default(1),
})

export const bridgeDesignSchema = z.object({
  id: z.string().min(1).max(64),
  name: z.string().trim().min(1).max(60),
  workshop: z.string().min(1).max(40),
  nodes: z.array(bridgeNodeSchema).max(120),
  members: z.array(bridgeMemberSchema).max(300),
  loadMode: z.enum(['center', 'truck']).default('center'),
  budget: z.number().min(0).max(10000).default(60),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
})

/** Picks the right design validator for a workshop. */
export function designSchemaFor(workshop: string | undefined) {
  return workshop === 'bridge-builder' ? bridgeDesignSchema : rocketDesignSchema
}

/** Generic saved test: any workshop may log one. */
export const testRecordSchema = z.object({
  id: z.string().min(1).max(64),
  workshop: z.string().min(1).max(40).default('water-rocket'),
  designId: z.string().min(1).max(64),
  designName: z.string().max(60),
  settings: z.record(z.string().max(40), z.unknown()),
  result: z.record(z.string().max(40), z.unknown()),
  createdAt: z.string(),
})
