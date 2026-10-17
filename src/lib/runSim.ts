import type { LaunchResult, RocketDesign } from '../../shared/types'
import { simulateLaunch } from '../sim/rocket'
import { simOptionsFor } from '../three/launcherGeometry'

/** Simulate using the same launcher geometry the 3-D scene draws. */
export function runLaunch(design: RocketDesign): LaunchResult {
  return simulateLaunch(design, simOptionsFor(design.launchAngleDeg))
}

export function predict(design: RocketDesign) {
  const r = simulateLaunch(design, { ...simOptionsFor(design.launchAngleDeg), sampleIntervalS: 1 })
  return {
    liftedOff: r.liftedOff,
    maxHeightM: r.maxHeightM,
    rangeM: r.rangeM,
    flightTimeS: r.flightTimeS,
    maxSpeedMs: r.maxSpeedMs,
    thrustTimeS: r.thrustTimeS,
    landingSpeedMs: r.landingSpeedMs,
    safeLanding: r.safeLanding,
    stageCount: r.stageCount,
  }
}
