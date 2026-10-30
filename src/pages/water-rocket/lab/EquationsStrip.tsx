import { Link } from 'react-router'
import type { LaunchResult, RocketDesign } from '../../../../shared/types'
import { AssumptionsPanel } from '../../../components/AssumptionsPanel'
import { Formula } from '../../../components/Formula'
import { LabPanel } from '../../../components/lab'
import { labMath } from '../../../sim/labMath'
import { NOZZLE_DISCHARGE, PHYS } from '../../../sim/rocket'

const R = String.raw

/** The relations the simulator applies, with this design's numbers substituted. For ages 12 and up. */
export function EquationsStrip({ design, flight, className = '' }: { design: RocketDesign; flight: LaunchResult; className?: string }) {
  const m = labMath(design, flight)
  const dP = m.pGauge / 1000
  const dragStole = m.Hideal > 0 ? Math.max(0, 1 - flight.maxHeightM / m.Hideal) : 0
  const noFlight = !flight.liftedOff
  const nozzleNote = design.boosters.length > 0 ? ' (bottom booster fires first)' : ''

  return (
    <LabPanel
      title="Equations"
      span
      compact
      className={className}
      readout={<span className="lab-k">the relations the simulator uses, with your numbers filled in · ages 12 and up</span>}
      tools={
        <Link to="../math" className="lab-link">
          full derivations on The Math tab →
        </Link>
      }
    >
      <div className="grid gap-2 p-2 md:grid-cols-2 xl:grid-cols-3">
        <Eq title="1 · Water exit speed (Bernoulli)" tex={R`v_e = \sqrt{\dfrac{2\,(P - P_{\text{atm}})}{\rho_w}}`} sub={`= √(2 × ${f(dP, 1)} kPa / ${PHYS.rhoWater} kg·m⁻³)`} result={`vₑ = ${f(m.ve0, 1)} m/s (${f(m.ve0 * 3.6, 0)} km/h)`} />
        <Eq
          title={`2 · Thrust at the nozzle${nozzleNote}`}
          tex={R`F = 2\,C_n A_n\,(P - P_{\text{atm}})`}
          sub={`= 2 × ${NOZZLE_DISCHARGE} × ${f(m.AnGeo * 1e6, 0)} mm² × ${f(dP, 1)} kPa`}
          result={`F₀ = ${f(m.F0, 0)} N   ·   a₀ = F₀/m₀ − g·sinθ = ${f(m.F0, 0)}/${f(m.m0, 3)} − ${f(PHYS.g * Math.sin(m.theta), 1)} = ${f(m.a0, 0)} m/s² (${f(m.a0 / PHYS.g, 1)} g)`}
          warn={noFlight ? `thrust ${f(m.F0, 0)} N < weight ${f(m.m0 * PHYS.g, 0)} N: no lift-off` : undefined}
        />
        <Eq
          title="3 · Air expands adiabatically"
          tex={R`P(V_a) = P_0\left(\dfrac{V_{a,0}}{V_a}\right)^{\gamma},\quad \gamma = 1.4`}
          sub={`P₀ = ${f(m.p0 / 1000, 0)} kPa abs · V₍a,0₎ = ${f(m.Va0 * 1e6, 0)} ml → when the water is gone (Vₐ = ${f(m.V * 1e6, 0)} ml)`}
          result={`P = ${f(m.p0 / 1000, 0)} × (${f(m.Va0 * 1e6, 0)}/${f(m.V * 1e6, 0)})^1.4 = ${f(m.pEmpty / 1000, 0)} kPa abs (${f(Math.max(m.pEmpty - PHYS.pAtm, 0) / 1000, 0)} kPa gauge left)`}
        />
        <Eq
          title="4 · Drag at burnout"
          tex={R`F_d = \tfrac12\,\rho_{\text{air}}\,C_d\,A_f\,v^2`}
          sub={`= ½ × ${PHYS.rhoAir} × ${f(m.Cd, 2)} × ${f(m.Af * 1e4, 1)} cm² × (${f(m.vb, 1)} m/s)²`}
          result={`F_d = ${f(m.dragAtBurnout, 2)} N = ${f(m.dragAtBurnout / Math.max(m.mDry * PHYS.g, 1e-9), 1)} × the empty rocket's weight`}
        />
        <Eq
          title="5 · Apogee and range without air"
          tex={R`H = \dfrac{v_b^2\sin^2\theta}{2g} \qquad R = \dfrac{v_b^2\sin 2\theta}{g}`}
          sub={`v_b = ${f(m.vb, 1)} m/s at burnout (${f(flight.thrustTimeS * 1000, 0)} ms), θ = ${design.launchAngleDeg}°`}
          result={`H = ${f(m.Hideal, 1)} m vs simulated ${f(flight.maxHeightM, 1)} m (drag took ${f(dragStole * 100, 0)} %) · R = ${f(m.Rideal, 1)} m vs ${f(flight.rangeM, 1)} m`}
        />
        <Eq
          title="6 · Energy and efficiency"
          tex={R`W = \dfrac{P_0 V_{a,0} - P_1 V}{\gamma - 1} \qquad \eta = \dfrac{m_{\text{dry}}\,g\,H}{W}`}
          sub={`W = (${f(m.p0 / 1000, 0)} kPa × ${f(m.Va0 * 1e6, 0)} ml − ${f(m.pEmpty / 1000, 0)} kPa × ${f(m.V * 1e6, 0)} ml) / 0.4`}
          result={`W = ${f(m.W, 0)} J stored in the air · E_p = ${f(m.Ep, 1)} J at the top · η = ${f(m.eta * 100, 1)} %`}
        />
      </div>
      <div className="px-2 pb-2">
        <p className="lab-prose mb-2">
          Between these snapshots the simulator does not use a formula at all: it recomputes thrust, drag, mass and pressure every 0.5 ms (Euler's method,
          about 2 000 steps per simulated second) and adds up the motion. The numbers above are the same model evaluated at t = 0 and at burnout.
        </p>
        <AssumptionsPanel dark moreTo="/workshops/water-rocket/math" />
      </div>
    </LabPanel>
  )
}

function Eq({ title, tex, sub, result, warn }: { title: string; tex: string; sub: string; result: string; warn?: string }) {
  return (
    <div className="lab-eq">
      <div className="lab-eq-title">{title}</div>
      <div className="mt-1 py-2" style={{ overflow: 'visible' }}>
        <Formula tex={tex} />
      </div>
      <div className="lab-eq-sub">{sub}</div>
      <div className="lab-eq-result">{result}</div>
      {warn && <div className="lab-accent mt-1">{warn}</div>}
    </div>
  )
}

function f(v: number, digits: number) {
  if (!Number.isFinite(v)) return '—'
  return v.toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits })
}
