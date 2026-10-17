/**
 * Everything the simulator assumes, written for curious kids and honest grown-ups.
 * Shown on the Build, Launch and Math pages so nobody mistakes an estimate for a measurement.
 */
export interface Assumption {
  id: string
  title: string
  /** What the model does. */
  assume: string
  /** How real rockets differ. */
  reality: string
  /** How much it can move the result. */
  effect: 'small' | 'medium' | 'large'
}

export const ASSUMPTIONS: Assumption[] = [
  {
    id: 'drag',
    title: 'Drag coefficient comes from the nose shape',
    assume: 'Pointy 0.4, round 0.5, flat 0.85, plus 0.03 for a fourth fin. Frontal area is the bottle’s circle.',
    reality: 'A wobbly, rough or badly finned rocket can have double the drag. This is the biggest reason real flights differ from the simulator.',
    effect: 'large',
  },
  {
    id: 'stable',
    title: 'The rocket always flies nose-first',
    assume: 'Perfect fins: after leaving the launch guide the rocket points along its velocity.',
    reality: 'Under-finned or nose-light rockets tumble, which can halve the height.',
    effect: 'large',
  },
  {
    id: 'tube',
    title: 'No launch-tube boost',
    assume: 'The rocket slides off a thin guide; nothing pushes on it before water flows.',
    reality: 'Launchers with a tube that fits inside the neck add a kick worth up to 10–20 % more height.',
    effect: 'medium',
  },
  {
    id: 'adiabatic',
    title: 'Air expands without heat flowing in or out (adiabatic, γ = 1.4)',
    assume: 'The burst lasts a tenth of a second, so the air cools as it expands: P·V^1.4 stays constant.',
    reality: 'Real bottles are between adiabatic and constant-temperature; the difference is a few percent.',
    effect: 'small',
  },
  {
    id: 'nozzle',
    title: 'Water leaves at Bernoulli speed, times a nozzle factor of 0.95',
    assume: 'vₑ = √(2ΔP/ρ) and only 95 % of the nozzle area carries flow, because the jet squeezes slightly.',
    reality: 'Ragged nozzles can be 0.8–0.9; smooth bottle necks 0.95–0.98.',
    effect: 'small',
  },
  {
    id: 'air-burst',
    title: 'Leftover air escapes at the speed of sound, cooled by the expansion',
    assume: 'After the water is gone the remaining air exits as choked flow until the pressure drops.',
    reality: 'The end of a real burst is a messy water-air spray. The air adds roughly 5–15 % of the push.',
    effect: 'small',
  },
  {
    id: 'atmosphere',
    title: 'Standard air, 20 °C, no wind',
    assume: 'Air density 1.225 kg/m³, gravity 9.81 m/s², outside pressure 101.3 kPa.',
    reality: 'Hot days and high altitude thin the air (a little less drag). Wind bends the path and can tip the rocket.',
    effect: 'small',
  },
  {
    id: 'point-mass',
    title: 'The rocket is a point with no spin or sloshing',
    assume: 'Mass changes as water leaves, but nothing bends, spins or sloshes.',
    reality: 'Sloshing water can cause a wobble in the first metres.',
    effect: 'small',
  },
  {
    id: 'parachute',
    title: 'Parachute: flat plastic canopy, Cd 0.75, opens 0.3 s after apogee',
    assume: 'The nose lets go 0.3 s after the top of the flight, the canopy inflates over 0.5 s, and it weighs 60 g per square metre plus 10 g of string and swivel.',
    reality: 'Nose cones stick, chutes tangle or open late, and a canopy that opens while still climbing can tear. Landing speeds are usually within a metre per second of the model.',
    effect: 'medium',
  },
  {
    id: 'staging',
    title: 'Stages share one pressure and separate the instant the lower one empties',
    assume: 'Every bottle is pumped to the same pressure; the booster drops away cleanly with no delay and no bump.',
    reality: 'Real couplers leak a little, release a moment late and can nudge the sustainer sideways. Two-stage rockets are the hardest build in the lab.',
    effect: 'medium',
  },
  {
    id: 'wind',
    title: 'Wind is steady and horizontal, along the flight direction',
    assume: 'Drag is computed against the moving air; a tailwind carries the rocket (and especially its parachute) downrange.',
    reality: 'Gusts and crosswinds also tip the rocket at launch and make it weathercock into the wind.',
    effect: 'small',
  },
  {
    id: 'numerics',
    title: 'Time is chopped into 0.5 ms steps (Euler’s method)',
    assume: 'Forces are recomputed 2 000 times per second of flight.',
    reality: 'Halving the step changes results by well under 1 %, far less than the drag uncertainty.',
    effect: 'small',
  },
]

export const ACCURACY_NOTE =
  'Treat every number as an estimate. Real flights usually land within about ±25 % of the simulated height, mostly because of drag and wobble.'

export const EFFECT_LABEL: Record<Assumption['effect'], string> = {
  small: 'small effect',
  medium: 'medium effect',
  large: 'big effect',
}
