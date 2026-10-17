import { useMemo, type ReactNode } from 'react'
import { Link } from 'react-router'
import type { RocketDesign } from '../../../shared/types'
import { Formula } from '../../components/Formula'
import { Page } from '../../components/layout/Page'
import { Callout } from '../../components/ui/Callout'
import { SectionTitle } from '../../components/ui/SectionTitle'
import { StatTile } from '../../components/ui/StatTile'
import { runLaunch } from '../../lib/runSim'
import { AssumptionsPanel } from '../../components/AssumptionsPanel'
import { CHUTE, NOZZLE_DISCHARGE, PHYS, SAFETY, bottleSpec, dragCoefficient, parachuteAreaM2, parachuteMassKg, psiToPa, stageList, terminalVelocity } from '../../sim/rocket'
import { useDesignStore } from '../../store/designStore'

const R = String.raw

export default function MathPage() {
  const design = useDesignStore((s) => s.design)
  const m = useRocketMath(design)

  return (
    <Page wide>
      <Callout emoji="🎓" title="Engineer level · ages 12 and up" tone="grape" className="mb-6">
        Younger builders can skip this tab and still launch! If you like algebra, this is where the Water Rocket Lab shows its
        working: the real equations the simulator uses, with the numbers for <strong>your</strong> rocket “{design.name}”
        filled in. Change the rocket in <Link to="../build" className="font-bold underline">Build</Link> and come back — every number updates.
      </Callout>

      <div className="card mb-8 bg-gradient-to-r from-skyblue/15 to-sun/15">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h2 className="font-display text-2xl font-bold">🧮 “{design.name}” by the numbers</h2>
          <span className="chip">
            {design.bottleVolumeL} L · {Math.round(design.waterFraction * 100)}% water · {design.pressurePsi} psi · {design.launchAngleDeg}° · nozzle{' '}
            {design.nozzleDiameterMm} mm
          </span>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6">
          <StatTile label="Gauge pressure" value={`${fmtN(m.pGauge / 1000, 0)} kPa`} sub={`${fmtN(m.pGauge, 0)} Pa`} tone="sun" />
          <StatTile label="Exit speed v₀" value={`${fmtN(m.ve0, 1)} m/s`} sub={`${fmtN(m.ve0 * 3.6, 0)} km/h`} tone="sky" />
          <StatTile label="Thrust at launch" value={`${fmtN(m.F0, 0)} N`} sub={`≈ ${fmtN(m.F0 / 9.81, 1)} kg-force`} tone="rocket" />
          <StatTile label="Mass at launch" value={`${fmtN(m.m0 * 1000, 0)} g`} sub={`${fmtN(m.mDry * 1000, 0)} g rocket + ${fmtN(m.mWater * 1000, 0)} g water`} />
          <StatTile label="Acceleration" value={`${fmtN(m.a0, 0)} m/s²`} sub={`${fmtN(m.a0 / PHYS.g, 1)} g`} tone="grass" />
          <StatTile label="Thrust lasts" value={`${fmtN(m.sim.thrustTimeS * 1000, 0)} ms`} sub={`rough estimate ${fmtN(m.tBurnRough * 1000, 0)} ms`} tone="grape" />
        </div>
        {!m.sim.liftedOff && (
          <Callout emoji="🪨" tone="rocket" className="mt-3">
            With these settings the thrust ({fmtN(m.F0, 1)} N) is less than the weight ({fmtN(m.m0 * PHYS.g, 1)} N), so the rocket never leaves the pad.
            The equations below still work — they just predict a flight of zero!
          </Callout>
        )}
      </div>

      {/* 1. Newton */}
      <MathSection emoji="🍎" title="1. Newton’s laws, in symbols" lead="Everything about the flight comes from two of Newton’s laws.">
        <TwoCol
          left={
            <>
              <Formula block tex={R`F = m\,a \qquad\Longrightarrow\qquad a = \frac{F}{m}`} />
              <p className="prose-kid">
                A force <Formula tex="F" /> on a mass <Formula tex="m" /> produces an acceleration <Formula tex="a" />. Same push, lighter rocket, bigger
                acceleration. That is why engineers fight for every gram.
              </p>
              <Formula block tex={R`\vec F_{\text{water on rocket}} = -\,\vec F_{\text{rocket on water}}`} />
              <p className="prose-kid">
                The third law: the rocket shoves water downwards, and the water shoves the rocket upwards with <strong>exactly</strong> the same
                force. There is no “pushing against the ground” — the rocket would work just as well in space.
              </p>
            </>
          }
          right={
            <LiveBox title="In your rocket">
              <Row k="Thrust at t = 0" v={`${fmtN(m.F0, 1)} N`} />
              <Row k="Weight (m·g)" v={`${fmtN(m.m0 * PHYS.g, 1)} N`} />
              <Row k="Net force along the launch tube" v={`${fmtN(m.F0 - m.m0 * PHYS.g * Math.sin(m.theta), 1)} N`} />
              <Row k="Acceleration a = F/m − g·sinθ" v={`${fmtN(m.a0, 1)} m/s² = ${fmtN(m.a0 / PHYS.g, 1)} g`} />
              <p className="mt-2 text-sm text-ink-soft">For comparison, a sports car manages about 1 g and astronauts feel about 3 g at lift-off.</p>
            </LiveBox>
          }
        />
      </MathSection>

      {/* 2. Thrust */}
      <MathSection emoji="💦" title="2. How hard does the water push? (thrust)" lead="Pressure turns into speed at the nozzle; speed times mass flow is thrust.">
        <TwoCol
          left={
            <>
              <p className="prose-kid">
                Bernoulli’s equation says pressure energy becomes kinetic energy. For water leaving the nozzle at speed <Formula tex="v_e" />:
              </p>
              <Formula block tex={R`v_e = \sqrt{\frac{2\,(P - P_{\text{atm}})}{\rho_w}}`} />
              <p className="prose-kid">The mass leaving every second (the mass flow rate) is density × area × speed:</p>
              <Formula block tex={R`\dot m = \rho_w\,C_n A_n\,v_e \qquad A_n = \pi\left(\tfrac{d}{2}\right)^2, \quad C_n \approx 0.95`} />
              <p className="prose-kid">
                <Formula tex="C_n" /> is the nozzle (discharge) coefficient: the jet squeezes a little as it leaves, so only about 95 % of
                the hole is really flowing. Thrust is mass flow × exit speed. Substitute and watch the water density cancel out:
              </p>
              <Formula block tex={R`F_{\text{thrust}} = \dot m\,v_e = \rho_w C_n A_n v_e^2 = 2\,C_n A_n\,(P - P_{\text{atm}})`} />
              <Callout emoji="🤯" tone="sun">
                Surprise: at any instant the thrust depends only on the <strong>pressure</strong> and the <strong>nozzle size</strong>. So why does water matter?
                Because water is dense: it leaves slowly enough to keep the push going, while the air inside expands slowly. Air alone rushes out
                in a few milliseconds.
              </Callout>
            </>
          }
          right={
            <LiveBox title="In your rocket">
              <Row k="1 psi" v="6 894.76 Pa" />
              <Row k={`${design.pressurePsi} psi gauge`} v={`${fmtN(m.pGauge, 0)} Pa`} />
              <Row k="Nozzle area Aₙ" v={`${fmtN(m.AnGeo * 1e6, 0)} mm² = ${m.AnGeo.toExponential(2)} m²`} />
              <Row k="Effective area Cₙ·Aₙ" v={`${fmtN(m.An * 1e6, 0)} mm² (Cₙ = ${NOZZLE_DISCHARGE})`} />
              <Row k="Exit speed vₑ" v={`${fmtN(m.ve0, 1)} m/s`} />
              <Row k="Mass flow ṁ" v={`${fmtN(m.mdot0, 2)} kg/s`} />
              <Row k="Thrust 2·Cₙ·Aₙ·ΔP" v={`${fmtN(m.F0, 1)} N`} />
              <Legend
                items={[
                  ['P', 'absolute pressure inside the bottle (Pa)'],
                  ['P_{atm}', '101 325 Pa, the air pressure outside'],
                  [R`\rho_w`, '1000 kg/m³, the density of water'],
                  ['d', 'nozzle diameter (m)'],
                ]}
              />
            </LiveBox>
          }
        />
      </MathSection>

      {/* 3. Adiabatic expansion */}
      <MathSection emoji="🎈" title="3. The squeezed air runs out (adiabatic expansion)" lead="As water leaves, the air gets more room and its pressure collapses.">
        <TwoCol
          left={
            <>
              <p className="prose-kid">
                The burst is so fast that no heat gets in or out — physicists call that <strong>adiabatic</strong>. For air the rule is
              </p>
              <Formula block tex={R`P\,V^{\gamma} = \text{constant}, \qquad \gamma \approx 1.4`} />
              <Formula block tex={R`P(t) = P_0\left(\frac{V_{a,0}}{V_a(t)}\right)^{\gamma}`} />
              <p className="prose-kid">
                <Formula tex="V_a" /> is the air’s volume, which grows as water leaves. Because <Formula tex={R`\gamma > 1`} />, the pressure
                falls <em>faster</em> than the volume grows. Little air to begin with (lots of water) means the pressure crashes almost at once.
              </p>
            </>
          }
          right={
            <LiveBox title="Pressure as the water leaves">
              <PressureCurve points={m.pressureCurve} />
              <Row k="Air volume at start" v={`${fmtN(m.Va0 * 1000, 0)} ml`} />
              <Row k="Pressure with half the water gone" v={`${fmtN((m.pHalf - PHYS.pAtm) / 1000, 0)} kPa`} />
              <Row k="Pressure when the water is gone" v={`${fmtN(Math.max(m.pEmpty - PHYS.pAtm, 0) / 1000, 0)} kPa`} />
            </LiveBox>
          }
        />
      </MathSection>

      {/* 4. Drag */}
      <MathSection emoji="🌬️" title="4. The air pushes back (drag)" lead="Drag grows with the square of the speed, which is why fast rockets lose so much.">
        <TwoCol
          left={
            <>
              <Formula block tex={R`F_d = \tfrac12\,\rho_{\text{air}}\,C_d\,A_f\,v^2`} />
              <p className="prose-kid">
                Double the speed and drag is <strong>four</strong> times bigger. <Formula tex="C_d" /> is the drag coefficient: about 0.4 for a pointy
                nose, 0.5 for a round one and 0.85 for a flat bottle end (a textbook streamlined shape would be 0.3, but taped-on fins are not textbook). <Formula tex="A_f" /> is the frontal area — the circle you see looking
                straight down at the nose.
              </p>
            </>
          }
          right={
            <LiveBox title="In your rocket">
              <Row k="Frontal area A_f" v={`${fmtN(m.Af * 1e4, 1)} cm²`} />
              <Row k={`C_d (${design.noseShape} nose, ${design.finCount} fins)`} v={fmtN(m.Cd, 2)} />
              <Row k="Speed at burnout" v={`${fmtN(m.vb, 1)} m/s`} />
              <Row k="Drag at that speed" v={`${fmtN(m.dragAtBurnout, 2)} N`} />
              <Row k="Weight of the empty rocket" v={`${fmtN(m.mDry * PHYS.g, 2)} N`} />
              <p className="mt-2 text-sm text-ink-soft">
                Right after burnout, drag is about <strong>{fmtN(m.dragAtBurnout / Math.max(m.mDry * PHYS.g, 1e-9), 1)}×</strong> the rocket’s weight: the air is slowing it down far
                more than gravity is.
              </p>
            </LiveBox>
          }
        />
      </MathSection>

      {/* 5. Trajectory */}
      <MathSection emoji="🌈" title="5. The flight path (projectile motion)" lead="Once the thrust is over, the rocket is just a thrown ball — with air in the way.">
        <TwoCol
          left={
            <>
              <p className="prose-kid">Ignore air for a moment. A rocket coasting at speed <Formula tex="v_0" /> and angle <Formula tex={R`\theta`} /> follows</p>
              <Formula block tex={R`x(t) = v_0\cos\theta\; t \qquad y(t) = v_0\sin\theta\; t - \tfrac12 g t^2`} />
              <p className="prose-kid">Solving for the highest point, the landing spot and the time in the air:</p>
              <Formula block tex={R`H = \frac{v_0^2\sin^2\theta}{2g} \qquad R = \frac{v_0^2\sin 2\theta}{g} \qquad T = \frac{2 v_0 \sin\theta}{g}`} />
              <Callout emoji="📐" tone="sky">
                <Formula tex={R`\sin 2\theta`} /> is biggest when <Formula tex={R`2\theta = 90^\circ`} />, so <strong>45°</strong> gives the longest
                throw in a vacuum. With drag, the rocket spends less time in the air than the formula thinks, so a slightly <em>lower</em> angle
                (around 40°) usually wins. Test it on the launch pad!
              </Callout>
            </>
          }
          right={
            <LiveBox title="Ideal vs. simulated">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-xs font-extrabold uppercase text-ink-soft">
                    <th className="py-1" />
                    <th className="py-1">No air (formula)</th>
                    <th className="py-1">Simulator</th>
                  </tr>
                </thead>
                <tbody className="font-display text-lg font-bold tabular-nums">
                  <tr>
                    <td className="py-1 font-sans text-sm font-bold text-ink-soft">Height H</td>
                    <td className="py-1">{fmtN(m.Hideal, 1)} m</td>
                    <td className="py-1">{fmtN(m.sim.maxHeightM, 1)} m</td>
                  </tr>
                  <tr>
                    <td className="py-1 font-sans text-sm font-bold text-ink-soft">Distance R</td>
                    <td className="py-1">{fmtN(m.Rideal, 1)} m</td>
                    <td className="py-1">{fmtN(m.sim.rangeM, 1)} m</td>
                  </tr>
                  <tr>
                    <td className="py-1 font-sans text-sm font-bold text-ink-soft">Time T</td>
                    <td className="py-1">{fmtN(m.Tideal, 1)} s</td>
                    <td className="py-1">{fmtN(m.sim.flightTimeS, 1)} s</td>
                  </tr>
                </tbody>
              </table>
              <p className="mt-2 text-sm text-ink-soft">
                Using the simulator’s burnout speed v₀ = {fmtN(m.vb, 1)} m/s and θ = {design.launchAngleDeg}°. Air resistance “stole” about{' '}
                <strong>{fmtN(Math.max(0, 1 - m.sim.maxHeightM / Math.max(m.Hideal, 1e-9)) * 100, 0)}%</strong> of the ideal height.
              </p>
            </LiveBox>
          }
        />
      </MathSection>

      {/* 6. Energy */}
      <MathSection emoji="🔋" title="6. Where does the energy go?" lead="Pumping stores energy in the squeezed air. Only a little of it ends up as height.">
        <TwoCol
          left={
            <>
              <p className="prose-kid">The work the air can do while it expands adiabatically from <Formula tex="V_{a,0}" /> to the whole bottle <Formula tex="V" />:</p>
              <Formula block tex={R`W = \frac{P_0 V_{a,0} - P_1 V}{\gamma - 1}, \qquad P_1 = P_0\left(\frac{V_{a,0}}{V}\right)^{\gamma}`} />
              <p className="prose-kid">The useful result is the rocket’s potential energy at the top:</p>
              <Formula block tex={R`E_p = m_{\text{dry}}\, g\, H \qquad \eta = \frac{E_p}{W}`} />
              <p className="prose-kid">
                Most of the energy leaves with the fast-moving water, and more is lost stirring the air. Real rockets have exactly the same
                problem — engineers call <Formula tex={R`\eta`} /> the efficiency.
              </p>
            </>
          }
          right={
            <LiveBox title="In your rocket">
              <Row k="Energy stored in the air W" v={`${fmtN(m.W, 0)} J`} />
              <Row k="Potential energy at the top E_p" v={`${fmtN(m.Ep, 1)} J`} />
              <Row k="Efficiency η" v={`${fmtN(m.eta * 100, 1)} %`} />
              <p className="mt-2 text-sm text-ink-soft">
                {fmtN(m.W, 0)} J is about the energy of lifting a {fmtN(m.W / (PHYS.g * 1), 1)} kg bag one metre — or roughly {fmtN(m.W / 4184, 3)} food calories.
              </p>
            </LiveBox>
          }
        />
      </MathSection>

      {/* 7. Terminal velocity */}
      <MathSection emoji="🪂" title="7. Coming down: terminal velocity" lead="A falling rocket speeds up until drag equals weight. Then it stops accelerating.">
        <TwoCol
          left={
            <>
              <p className="prose-kid">Set the drag force equal to the weight and solve for the speed:</p>
              <Formula block tex={R`\tfrac12\,\rho_{\text{air}}\,C_d A\,v_t^2 = m\,g \quad\Longrightarrow\quad v_t = \sqrt{\frac{2\,m\,g}{\rho_{\text{air}}\,C_d A}}`} />
              <p className="prose-kid">
                With a parachute the drag area <Formula tex="C_d A" /> is the rocket’s plus the canopy’s (<Formula tex={R`C_d \approx 0.75`} /> for a
                flat plastic circle). Four times the canopy area halves the landing speed — a square root again. The simulator opens the canopy{' '}
                {CHUTE.deployDelayS} s after apogee and inflates it over {CHUTE.inflateS} s.
              </p>
            </>
          }
          right={
            <LiveBox title="In your rocket">
              <Row k="Empty top stage" v={`${fmtN(m.mDry * 1000, 0)} g`} />
              <Row k="Without a parachute" v={`${fmtN(m.vtPlain, 1)} m/s`} />
              {design.recovery === 'parachute' ? (
                <>
                  <Row k={`Canopy ${Math.round(design.parachuteDiameterM * 100)} cm → area`} v={`${fmtN(m.chuteArea, 3)} m²`} />
                  <Row k="Canopy mass" v={`${fmtN(m.chuteMass * 1000, 0)} g`} />
                  <Row k="With the parachute" v={`${fmtN(m.vtChute, 1)} m/s`} />
                  <Row k="Simulator landing speed" v={`${fmtN(m.sim.landingSpeedMs, 1)} m/s`} />
                </>
              ) : (
                <p className="mt-2 text-sm text-ink-soft">Add a parachute in Build → Coming back down to see how a canopy changes this.</p>
              )}
            </LiveBox>
          }
        />
      </MathSection>

      {/* 8. Staging */}
      <MathSection emoji="🚀🚀" title="8. Why dropping a stage helps" lead="Impulse is force × time. Dead weight makes every newton-second count for less.">
        <TwoCol
          left={
            <>
              <Formula block tex={R`J = \int F\,dt \qquad \Delta v \approx \frac{J}{m}`} />
              <p className="prose-kid">
                Each stage delivers an impulse <Formula tex="J" />. The speed it adds is roughly that impulse divided by the mass it has to
                push. Once a booster is empty it is pure dead weight, so letting it go means the top stage’s impulse pushes a smaller{' '}
                <Formula tex="m" /> and gives a bigger <Formula tex={R`\Delta v`} />. It also helps that a fresh stage starts at full pressure at
                altitude, already moving fast.
              </p>
            </>
          }
          right={
            <LiveBox title="In your rocket">
              <Row k="Stages" v={`${m.stages.length}`} />
              {m.stages.map((st, i) => (
                <Row key={i} k={`Stage ${i + 1} ${i === m.stages.length - 1 ? '(top)' : '(booster)'}`} v={`${st.bottleVolumeL} L · ${Math.round(st.waterFraction * 100)}% · ${fmtN(st.dryMassG, 0)} g`} />
              ))}
              <Row k="Top stage alone would reach" v={`${fmtN(m.topAlone.maxHeightM, 1)} m`} />
              <Row k="Whole stack reaches" v={`${fmtN(m.sim.maxHeightM, 1)} m`} />
              {m.stages.length > 1 && <Row k="Separations at" v={m.sim.stageSeparationsS.map((t) => `${fmtN(t, 2)} s`).join(', ')} />}
            </LiveBox>
          }
        />
      </MathSection>

      {/* 9. Numerical integration */}
      <MathSection emoji="💻" title="9. How the simulator actually works" lead="There is no single formula for the whole flight, so the computer takes thousands of tiny steps.">
        <TwoCol
          left={
            <>
              <p className="prose-kid">
                Pressure, mass and drag all change every instant, so the simulator chops time into slices of <Formula tex={R`\Delta t = 0.0005\ \text{s}`} /> and
                repeats three lines, over and over:
              </p>
              <Formula block tex={R`a_n = \frac{F_{\text{thrust}} - F_d}{m_n} - g`} />
              <Formula block tex={R`v_{n+1} = v_n + a_n\,\Delta t \qquad x_{n+1} = x_n + v_{n+1}\,\Delta t`} />
              <p className="prose-kid">
                This is <strong>Euler’s method</strong>, invented in the 1700s and still the first thing every physics programmer learns. The Launch tab runs
                it about 2 000 times for every simulated second, then plays the result back in 3-D. The code lives in <code>src/sim/rocket.ts</code>.
              </p>
            </>
          }
          right={
            <LiveBox title="Your last flight, step by step">
              <Row k="Time slices computed" v={fmtN(m.sim.flightTimeS / 0.0005, 0)} />
              <Row k="Thrust phase" v={`${fmtN(m.sim.thrustTimeS * 1000, 0)} ms (${fmtN(m.sim.thrustTimeS / 0.0005, 0)} slices)`} />
              <Row k="Coasting" v={`${fmtN(m.sim.flightTimeS - m.sim.thrustTimeS, 2)} s`} />
              <Row k="Peak acceleration" v={`${m.sim.maxGs} g`} />
              <Row k="Apogee at" v={`${m.sim.apogeeTimeS} s`} />
            </LiveBox>
          }
        />
      </MathSection>

      <MathSection emoji="🔍" title="10. What the simulator assumes (and how real rockets differ)" lead="A model is only as honest as its list of assumptions. Here is ours.">
        <div className="card">
          <p className="prose-kid">
            Real launches usually come out within about <strong>±25 %</strong> of these numbers. Pressures are real gauge pressures: most school
            launches use up to {SAFETY.schoolMaxPsi} psi, {SAFETY.supervisedMaxPsi} psi needs an adult and a launch cord, competitions cap around{' '}
            {SAFETY.competitionMaxPsi} psi, and a new bottle bursts near {SAFETY.typicalBurstPsi} psi. The simulator lets you go to 80 psi so you can
            explore the physics safely on screen.
          </p>
          <AssumptionsPanel full className="mt-4" />
        </div>
      </MathSection>

      <section className="card mt-10 bg-ink text-white">
        <h2 className="font-display text-2xl font-bold">🧠 Think it through</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-6 text-white/90">
          <li>
            If you double the gauge pressure, what happens to the exit speed <Formula tex="v_e" className="!text-white" />? (Hint: it is under a square root.)
          </li>
          <li>Halving the nozzle area halves the thrust. Why does the rocket still fly almost as high? (Think about how long the push lasts.)</li>
          <li>Why does more water make the pressure collapse faster? Use the adiabatic formula.</li>
          <li>Your “no air” height was {fmtN(m.Hideal, 0)} m but the simulator says {fmtN(m.sim.maxHeightM, 0)} m. Which equation explains the difference?</li>
          <li>A parachute twice as wide has four times the area. How much slower does the rocket land? (Section 7.)</li>
        </ol>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link to="../worksheets/rocket-math" className="btn-sun">
            🧮 Do the Rocket Math Challenge worksheet
          </Link>
          <Link to="../launch" className="btn-ghost !bg-white/10 !text-white !ring-white/30">
            🚀 Test a prediction on the pad
          </Link>
        </div>
      </section>
    </Page>
  )
}

// ---------------------------------------------------------------------------

function useRocketMath(design: RocketDesign) {
  return useMemo(() => {
    const { g, rhoWater, rhoAir, pAtm, gamma } = PHYS
    const spec = bottleSpec(design.bottleVolumeL)
    const V = design.bottleVolumeL / 1000
    const Vw = design.waterFraction * V
    const Va0 = Math.max(V - Vw, 1e-6)
    const pGauge = psiToPa(design.pressurePsi)
    const p0 = pAtm + pGauge
    const dn = design.nozzleDiameterMm / 1000
    const AnGeo = Math.PI * (dn / 2) ** 2
    const An = NOZZLE_DISCHARGE * AnGeo
    const Af = Math.PI * (spec.diameterM / 2) ** 2
    const Cd = dragCoefficient(design)
    const mDry = design.dryMassG / 1000
    const mWater = rhoWater * Vw
    const m0 = mDry + mWater
    const theta = (design.launchAngleDeg * Math.PI) / 180
    const ve0 = Math.sqrt((2 * pGauge) / rhoWater)
    const mdot0 = rhoWater * An * ve0
    const F0 = 2 * An * pGauge
    const a0 = F0 / m0 - g * Math.sin(theta)
    const tBurnRough = Vw > 0 ? Vw / (An * ve0) : 0
    const pHalf = p0 * (Va0 / (V - Vw / 2)) ** gamma
    const pEmpty = p0 * (Va0 / V) ** gamma
    const sim = runLaunch(design)
    const vb = sim.burnoutSpeedMs
    const Hideal = (vb ** 2 * Math.sin(theta) ** 2) / (2 * g)
    const Rideal = (vb ** 2 * Math.sin(2 * theta)) / g
    const Tideal = (2 * vb * Math.sin(theta)) / g
    const dragAtBurnout = 0.5 * rhoAir * Cd * Af * vb ** 2
    const W = Math.max((p0 * Va0 - pEmpty * V) / (gamma - 1), 0)
    const Ep = mDry * g * sim.maxHeightM
    const eta = W > 0 ? Ep / W : 0
    const vtPlain = terminalVelocity({ ...design, recovery: 'none' })
    const vtChute = terminalVelocity({ ...design, recovery: 'parachute' })
    const chuteArea = parachuteAreaM2(design.parachuteDiameterM)
    const chuteMass = parachuteMassKg({ recovery: 'parachute', parachuteDiameterM: design.parachuteDiameterM })
    const stages = stageList(design)
    const topAlone = design.boosters.length > 0 ? runLaunch({ ...design, boosters: [] }) : sim
    const pressureCurve = Array.from({ length: 21 }, (_, i) => {
      const left = 1 - i / 20
      const Va = V - Vw * left
      return { left, pKPa: Math.max(p0 * (Va0 / Va) ** gamma - pAtm, 0) / 1000 }
    })
    return { vtPlain, vtChute, chuteArea, chuteMass, stages, topAlone, V, Vw, Va0, pGauge, p0, AnGeo, An, Af, Cd, mDry, mWater, m0, theta, ve0, mdot0, F0, a0, tBurnRough, pHalf, pEmpty, sim, vb, Hideal, Rideal, Tideal, dragAtBurnout, W, Ep, eta, pressureCurve }
  }, [design])
}

function fmtN(v: number, digits: number) {
  if (!Number.isFinite(v)) return '—'
  return v.toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits })
}

function MathSection({ emoji, title, lead, children }: { emoji: string; title: string; lead: string; children: ReactNode }) {
  return (
    <section className="mb-10">
      <SectionTitle emoji={emoji} title={title} subtitle={lead} />
      {children}
    </section>
  )
}

function TwoCol({ left, right }: { left: ReactNode; right: ReactNode }) {
  return (
    <div className="grid gap-5 lg:grid-cols-[1.25fr_1fr]">
      <div className="card space-y-3">{left}</div>
      <div>{right}</div>
    </div>
  )
}

function LiveBox({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="card h-full border-2 border-dashed border-grape/40 bg-grape/5">
      <div className="mb-2 font-display text-lg font-bold text-grape-dark">🔢 {title}</div>
      {children}
    </div>
  )
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-ink/5 py-1.5 last:border-0">
      <span className="text-sm font-bold text-ink-soft">{k}</span>
      <span className="font-display text-lg font-bold tabular-nums text-ink">{v}</span>
    </div>
  )
}

function Legend({ items }: { items: [string, string][] }) {
  return (
    <ul className="mt-3 space-y-1 text-sm text-ink-soft">
      {items.map(([sym, text]) => (
        <li key={sym} className="flex gap-2">
          <span className="w-14 shrink-0">
            <Formula tex={sym} />
          </span>
          <span>{text}</span>
        </li>
      ))}
    </ul>
  )
}

function PressureCurve({ points }: { points: { left: number; pKPa: number }[] }) {
  const W = 320
  const H = 150
  const padL = 36
  const padB = 26
  const max = Math.max(1, ...points.map((p) => p.pKPa))
  const x = (left: number) => padL + (1 - left) * (W - padL - 8)
  const y = (p: number) => 8 + (H - padB - 8) * (1 - p / max)
  const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(p.left).toFixed(1)} ${y(p.pKPa).toFixed(1)}`).join(' ')
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="mb-2 h-auto w-full" role="img" aria-label="Pressure versus water left">
      <line x1={padL} x2={W - 8} y1={H - padB} y2={H - padB} stroke="#1e2a4a" strokeOpacity={0.3} />
      <line x1={padL} x2={padL} y1={8} y2={H - padB} stroke="#1e2a4a" strokeOpacity={0.3} />
      <path d={d} fill="none" stroke="#845ec2" strokeWidth={3} strokeLinecap="round" />
      <text x={padL - 4} y={12} textAnchor="end" fontSize={10} fontWeight={700} fill="#4a5578">
        {Math.round(max)}
      </text>
      <text x={padL - 4} y={H - padB + 3} textAnchor="end" fontSize={10} fontWeight={700} fill="#4a5578">
        0
      </text>
      <text x={padL} y={H - 8} fontSize={10} fontWeight={700} fill="#4a5578">
        full
      </text>
      <text x={W - 8} y={H - 8} textAnchor="end" fontSize={10} fontWeight={700} fill="#4a5578">
        water gone →
      </text>
      <text x={6} y={H / 2} fontSize={10} fontWeight={700} fill="#4a5578" transform={`rotate(-90 6 ${H / 2})`} textAnchor="middle">
        kPa
      </text>
    </svg>
  )
}
