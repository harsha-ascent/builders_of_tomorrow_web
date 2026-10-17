import type { SimOptions } from '../sim/rocket'

/** Shared launcher dimensions (metres) so the 3-D scene and the physics agree on where the rocket starts. */
export const LAUNCHER = {
  pivotHeight: 0.35,
  tubeLength: 0.4,
  /** How far up the launch tube the rocket's nozzle sits. */
  rocketOffset: 0.12,
}

export function restPose(angleDeg: number) {
  const theta = (angleDeg * Math.PI) / 180
  return {
    x: LAUNCHER.rocketOffset * Math.cos(theta),
    y: LAUNCHER.pivotHeight + LAUNCHER.rocketOffset * Math.sin(theta),
    /** Rotation about Z that tilts the rocket's +Y axis towards +X. */
    rotZ: theta - Math.PI / 2,
    theta,
  }
}

export function simOptionsFor(angleDeg: number): SimOptions {
  return {
    launcherHeightM: restPose(angleDeg).y,
    guideLengthM: LAUNCHER.tubeLength - LAUNCHER.rocketOffset,
  }
}
