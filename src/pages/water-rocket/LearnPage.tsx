import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router'
import { SweepChart } from '../../components/charts/SweepChart'
import { Page } from '../../components/layout/Page'
import { Callout } from '../../components/ui/Callout'
import { LazyMount } from '../../components/ui/LazyMount'
import { SectionTitle } from '../../components/ui/SectionTitle'
import { fmt } from '../../lib/format'
import { DEFAULT_DESIGN } from '../../sim/presets'
import { sweep } from '../../sim/rocket'
import { AngleScene, ANGLE_COLORS, ANGLE_OPTIONS, useAngleFlights } from '../../three/explainers/AngleScene'
import { NewtonScene } from '../../three/explainers/NewtonScene'
import { PartsScene, ROCKET_PARTS } from '../../three/explainers/PartsScene'
import { PressureScene } from '../../three/explainers/PressureScene'

const STANDARD = { ...DEFAULT_DESIGN, name: 'Standard rocket', launchAngleDeg: 90 }

export default function LearnPage() {
  return (
    <Page wide>
      <Callout emoji="👋" title="Hi, future engineer!" tone="sun" className="mb-8">
        A water rocket is a fizzy-drink bottle, some water and a bike pump. That is it! But inside is some of the
        same science that sends real rockets to space. Scroll down and play with each animation.
      </Callout>

      <PushBackSection />
      <PressureSection />
      <PartsSection />
      <AngleSection />
      <WaterSection />
      <Glossary />

      <div className="mt-12 flex flex-wrap justify-center gap-3">
        <Link to="../design-cycle" className="btn-sky">
          Next: the Engineering Design Cycle →
        </Link>
        <Link to="../build" className="btn-primary">
          I’m ready to build! 🔧
        </Link>
      </div>
    </Page>
  )
}

function PushBackSection() {
  const pushRef = useRef(false)
  return (
    <section className="mb-12">
      <SectionTitle emoji="🤜🤛" title="Push Back!" subtitle="Newton’s third law: every push has an equal push back the other way." />
      <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr]">
        <LazyMount className="h-[380px] overflow-hidden rounded-blob shadow-float">
          <NewtonScene pushRef={pushRef} />
        </LazyMount>
        <div className="card flex flex-col gap-4">
          <p className="prose-kid">
            The squeezed air inside the bottle <strong>pushes the water DOWN</strong> out of the nozzle. At the very same
            moment, the water <strong>pushes the rocket UP</strong>. That push is called <strong>thrust</strong>.
          </p>
          <button type="button" className="btn-primary self-start text-lg" onClick={() => (pushRef.current = true)}>
            💦 Push the water out!
          </button>
          <Callout emoji="🛹" tone="grass" title="Try this at home">
            Stand on a skateboard and throw a heavy ball forwards. Which way do YOU roll? That is the same push-back!
          </Callout>
        </div>
      </div>
    </section>
  )
}

function PressureSection() {
  const strokesRef = useRef(3)
  const [strokes, setStrokes] = useState(3)
  return (
    <section className="mb-12">
      <SectionTitle emoji="🫧" title="Squeeze the Air" subtitle="Air is made of tiny molecules that never stop moving." />
      <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr]">
        <LazyMount className="h-[380px] overflow-hidden rounded-blob shadow-float">
          <PressureScene strokesRef={strokesRef} />
        </LazyMount>
        <div className="card flex flex-col gap-4">
          <p className="prose-kid">
            Every pump stroke squeezes <strong>more</strong> air molecules into the same bottle. More molecules bump into
            the walls, harder and more often. That bumping is <strong>pressure</strong>, and it is what pushes the water
            out so fast.
          </p>
          <div>
            <div className="mb-1 flex justify-between font-display font-semibold">
              <span>Pump strokes</span>
              <span className="rounded-full bg-ink/5 px-3 tabular-nums">{strokes}</span>
            </div>
            <input
              type="range"
              min={0}
              max={10}
              step={1}
              value={strokes}
              aria-label="Pump strokes"
              onChange={(e) => {
                const v = Number(e.target.value)
                setStrokes(v)
                strokesRef.current = v
              }}
            />
            <div className="mt-2 flex items-center gap-3">
              <div className="h-5 flex-1 overflow-hidden rounded-full bg-ink/10">
                <div className="h-full rounded-full bg-gradient-to-r from-skyblue to-rocket transition-all" style={{ width: `${strokes * 10}%` }} />
              </div>
              <span className="font-display text-xl font-bold tabular-nums">{strokes * 10} psi</span>
            </div>
          </div>
          <Callout emoji="⚠️" tone="rocket" title="Safety first">
            Real bottles have a limit. Always stay under the pressure your grown-up helper sets, and never stand over a
            pumped-up rocket.
          </Callout>
        </div>
      </div>
    </section>
  )
}

function PartsSection() {
  const [selected, setSelected] = useState<string | null>('nozzle')
  const part = ROCKET_PARTS.find((p) => p.id === selected) ?? ROCKET_PARTS[0]
  return (
    <section className="mb-12">
      <SectionTitle emoji="🧩" title="Parts of a rocket and launcher" subtitle="Tap a label to find out what each part does." />
      <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr]">
        <LazyMount className="h-[440px] overflow-hidden rounded-blob shadow-float">
          <PartsScene design={{ ...STANDARD, launchAngleDeg: 75 }} selected={selected} onSelect={setSelected} />
        </LazyMount>
        <div className="card">
          <div className="text-5xl">{part.emoji}</div>
          <h3 className="mt-2 font-display text-2xl font-bold">{part.name}</h3>
          <p className="prose-kid mt-2">{part.job}</p>
          <Callout emoji="💡" tone="sun" className="mt-4">
            {part.tip}
          </Callout>
          <div className="mt-4 flex flex-wrap gap-2">
            {ROCKET_PARTS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setSelected(p.id)}
                className={`rounded-full px-3 py-1 text-sm font-bold transition ${
                  p.id === selected ? 'bg-ink text-white' : 'bg-ink/5 text-ink hover:bg-ink/10'
                }`}
              >
                {p.emoji} {p.name}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function AngleSection() {
  const [selected, setSelected] = useState<number>(45)
  const flights = useAngleFlights(STANDARD)
  return (
    <section className="mb-12">
      <SectionTitle emoji="📐" title="Which way should I aim?" subtitle="Same rocket, same pressure, same water — only the angle changes." />
      <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr]">
        <LazyMount className="h-[420px] overflow-hidden rounded-blob shadow-float">
          <AngleScene design={STANDARD} selected={selected} flights={flights} />
        </LazyMount>
        <div className="card">
          <p className="prose-kid">
            Straight up (<strong>90°</strong>) goes <strong>highest</strong>. But to fly <strong>furthest</strong> along the
            ground, aim at about <strong>45°</strong>: half up, half forward. Because air pushes back on the rocket, the
            best distance angle is often a little lower than 45°.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {ANGLE_OPTIONS.map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => setSelected(a)}
                style={{ backgroundColor: a === selected ? ANGLE_COLORS[a] : undefined, borderColor: ANGLE_COLORS[a] }}
                className={`rounded-full border-4 px-4 py-1 font-display text-lg font-bold transition ${
                  a === selected ? 'text-ink shadow-chunky-sm' : 'bg-white text-ink hover:scale-105'
                }`}
              >
                {a}°
              </button>
            ))}
          </div>
          <table className="mt-4 w-full text-left">
            <thead>
              <tr className="text-xs font-extrabold uppercase text-ink-soft">
                <th className="py-1">Angle</th>
                <th className="py-1">Height</th>
                <th className="py-1">Distance</th>
              </tr>
            </thead>
            <tbody>
              {ANGLE_OPTIONS.map((a) => {
                const f = flights.get(a)!
                return (
                  <tr key={a} className={`font-display text-lg ${a === selected ? 'font-bold' : ''}`}>
                    <td className="py-1">
                      <span className="mr-2 inline-block h-3 w-3 rounded-full" style={{ backgroundColor: ANGLE_COLORS[a] }} />
                      {a}°
                    </td>
                    <td className="py-1 tabular-nums">{fmt.m(f.maxHeightM)}</td>
                    <td className="py-1 tabular-nums">{fmt.m(f.rangeM)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}

function WaterSection() {
  const waterRows = useMemo(() => sweep(STANDARD, 'waterFraction', [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8]), [])
  const pressureRows = useMemo(() => sweep(STANDARD, 'pressurePsi', [20, 30, 40, 50, 60, 70, 80, 90, 100]), [])
  const best = waterRows.reduce((a, b) => (b.maxHeightM > a.maxHeightM ? b : a), waterRows[0])
  return (
    <section className="mb-12">
      <SectionTitle emoji="💧" title="How much water? How much air?" subtitle="Water is what gets pushed out. Squeezed air does the pushing. You need both!" />
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="card">
          <h3 className="font-display text-xl font-bold">Height vs. water</h3>
          <p className="mb-3 text-ink-soft">Standard rocket, 60 psi, straight up.</p>
          <SweepChart data={waterRows} metric="maxHeightM" formatX={(v) => `${Math.round(v * 100)}%`} highlight={best.value} xLabel="Bottle filled with water" />
          <Callout emoji="🎯" tone="grass" className="mt-3">
            The sweet spot is about <strong>{Math.round(best.value * 100)}% water</strong>. Too little and there is nothing to push out. Too
            much and the rocket is heavy with hardly any squeezed air left to do the pushing.
          </Callout>
        </div>
        <div className="card">
          <h3 className="font-display text-xl font-bold">Height vs. pressure</h3>
          <p className="mb-3 text-ink-soft">Standard rocket, 35% water, straight up.</p>
          <SweepChart data={pressureRows} metric="maxHeightM" formatX={(v) => `${v}`} color="#ff9f43" xLabel="Pump pressure (psi)" />
          <Callout emoji="📈" tone="sun" className="mt-3">
            More pressure = more push. But look closely: does doubling the pressure double the height? Check with the
            <strong> Pressure Power</strong> worksheet.
          </Callout>
        </div>
      </div>
    </section>
  )
}

function Glossary() {
  const words = [
    ['Thrust', 'The push that moves the rocket forward.'],
    ['Drag', 'Air pushing back on the rocket and slowing it down.'],
    ['Pressure', 'How hard squeezed air pushes on the walls of the bottle.'],
    ['Nozzle', 'The opening the water shoots out of.'],
    ['Trajectory', 'The curved path the rocket follows through the air.'],
    ['Apogee', 'The highest point of the flight.'],
    ['Fair test', 'Changing only ONE thing at a time so you know what caused the difference.'],
    ['Prototype', 'A first version you build to test an idea.'],
  ]
  return (
    <section>
      <SectionTitle emoji="🔤" title="Big words engineers use" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {words.map(([w, d]) => (
          <div key={w} className="card py-4">
            <div className="font-display text-lg font-bold text-rocket">{w}</div>
            <div className="text-ink">{d}</div>
          </div>
        ))}
      </div>
    </section>
  )
}
