/**
 * The handful of closed-form relations the Lab view's equation strip shows, evaluated for one design.
 * Same formulas as the simulator's first time step and the Math tab; kept here so the strip stays light.
 */
import type { LaunchResult, RocketDesign } from '../../shared/types'
import { NOZZLE_DISCHARGE, PHYS, bottleSpec, dragCoefficient, psiToPa, stageList, totalDryMassG } from './rocket'

export interface LabMath {
  /** Bottle volume, water volume and starting air volume of the stage that fires first (m³). */
  V: number
  Vw: number
  Va0: number
  /** Gauge and absolute pressure at launch (Pa). */
  pGauge: number
  p0: number
  /** Nozzle area, geometric and effective (m²). */
  AnGeo: number
  An: number
  /** Frontal area of the widest bottle (m²). */
  Af: number
  Cd: number
  /** Empty mass of the whole stack and the water in every stage (kg). */
  mDry: number
  mWater: number
  m0: number
  theta: number
  /** Water exit speed and thrust the instant the clamp lets go. */
  ve0: number
  mdot0: number
  F0: number
  /** Acceleration along the launch tube at t = 0 (m/s²). */
  a0: number
  /** Absolute pressure left when the water is gone (adiabatic). */
  pEmpty: number
  /** Simulator's burnout speed, and the drag-free textbook flight from it. */
  vb: number
  Hideal: number
  Rideal: number
  dragAtBurnout: number
  /** Energy stored in the squeezed air and the share that became height. */
  W: number
  Ep: number
  eta: number
}

export function labMath(design: RocketDesign, flight: LaunchResult): LabMath {
  const { g, rhoWater, rhoAir, pAtm, gamma } = PHYS
  const stages = stageList(design)
  const first = stages[0]
  const V = first.bottleVolumeL / 1000
  const Vw = first.waterFraction * V
  const Va0 = Math.max(V - Vw, 1e-6)
  const pGauge = psiToPa(design.pressurePsi)
  const p0 = pAtm + pGauge
  const AnGeo = Math.PI * (first.nozzleDiameterMm / 2000) ** 2
  const An = NOZZLE_DISCHARGE * AnGeo
  const maxD = Math.max(...stages.map((s) => bottleSpec(s.bottleVolumeL).diameterM))
  const Af = Math.PI * (maxD / 2) ** 2
  const Cd = dragCoefficient(design)
  const mDry = totalDryMassG(design) / 1000
  const mWater = stages.reduce((m, s) => m + rhoWater * s.waterFraction * (s.bottleVolumeL / 1000), 0)
  const m0 = mDry + mWater
  const theta = (design.launchAngleDeg * Math.PI) / 180
  const ve0 = Math.sqrt((2 * pGauge) / rhoWater)
  const mdot0 = rhoWater * An * ve0
  const F0 = 2 * An * pGauge
  const a0 = F0 / m0 - g * Math.sin(theta)
  const pEmpty = p0 * (Va0 / V) ** gamma
  const vb = flight.burnoutSpeedMs
  const Hideal = (vb ** 2 * Math.sin(theta) ** 2) / (2 * g)
  const Rideal = (vb ** 2 * Math.sin(2 * theta)) / g
  const dragAtBurnout = 0.5 * rhoAir * Cd * Af * vb ** 2
  const W = Math.max((p0 * Va0 - pEmpty * V) / (gamma - 1), 0)
  const Ep = (design.dryMassG / 1000) * g * flight.maxHeightM
  const eta = W > 0 ? Ep / W : 0
  return { V, Vw, Va0, pGauge, p0, AnGeo, An, Af, Cd, mDry, mWater, m0, theta, ve0, mdot0, F0, a0, pEmpty, vb, Hideal, Rideal, dragAtBurnout, W, Ep, eta }
}
