import { z } from 'zod'

const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Colour must look like #rrggbb')

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
  waterFraction: z.number().min(0).max(0.95),
  pressurePsi: z.number().min(0).max(200),
  launchAngleDeg: z.number().min(1).max(90),
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
})

export const launchRecordSchema = z.object({
  id: z.string().min(1).max(64),
  designId: z.string().min(1).max(64),
  designName: z.string().max(60),
  settings: z.object({
    waterFraction: z.number(),
    pressurePsi: z.number(),
    launchAngleDeg: z.number(),
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
