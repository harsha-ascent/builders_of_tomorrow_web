import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router'
import { BarChart } from '../../components/charts/BarChart'
import { Page } from '../../components/layout/Page'
import { Callout } from '../../components/ui/Callout'
import { LazyMount } from '../../components/ui/LazyMount'
import { SectionTitle } from '../../components/ui/SectionTitle'
import { MATERIAL_LIST, MATERIALS, compressionLimitN } from '../../sim/bridge'
import { BRIDGE_KINDS, BridgeTypesScene, type BridgeKind } from '../../three/bridge/explainers/BridgeTypesScene'
import { SquashStretchScene, type SquashMode } from '../../three/bridge/explainers/SquashStretchScene'
import { TriangleVsSquareScene } from '../../three/bridge/explainers/TriangleVsSquareScene'

export default function BridgeLearnPage() {
  return (
    <Page wide>
      <Callout emoji="👋" title="Hello, bridge builder!" tone="sun" className="mb-8">
        Every bridge, from a plank over a puddle to the Howrah Bridge, does one job: carry a load across a gap. Inside, every
        piece is either being <strong>squashed</strong> or <strong>stretched</strong>. Learn to see those forces and you can build a
        bridge out of almost anything — even spaghetti.
      </Callout>
      <SquashStretchSection />
      <TriangleSection />
      <TypesSection />
      <BucklingSection />
      <Glossary />
      <Callout emoji="🎓" title="Older builder? Want the real equations?" tone="grape" className="mt-12">
        The <Link to="../math" className="font-bold underline">The Math</Link> tab covers stress, Euler buckling, the method of joints and how the
        load-test solver works, with the numbers for your own bridge. Ages 12 and up.
      </Callout>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
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

function SquashStretchSection() {
  const modeRef = useRef<SquashMode>('idle')
  const [mode, setMode] = useState<SquashMode>('idle')
  const set = (m: SquashMode) => {
    modeRef.current = m
    setMode(m)
  }
  return (
    <section className="mb-12">
      <SectionTitle emoji="🤏" title="Squash and stretch" subtitle="Two forces, two colours: red is pulled, blue is pushed." />
      <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr]">
        <LazyMount className="h-[340px] overflow-hidden rounded-blob shadow-float">
          <SquashStretchScene modeRef={modeRef} />
        </LazyMount>
        <div className="card flex flex-col gap-4">
          <p className="prose-kid">
            <strong>Tension</strong> pulls a piece longer, like a tug-of-war rope. <strong>Compression</strong> squeezes it shorter. A long thin piece that is
            pushed does something sneaky: it suddenly bows sideways. That is <strong>buckling</strong>, and it is how most model bridges die.
          </p>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={`btn ${mode === 'pull' ? 'bg-rocket text-white' : 'btn-ghost'}`} onClick={() => set(mode === 'pull' ? 'idle' : 'pull')}>
              🔴 Pull it
            </button>
            <button type="button" className={`btn ${mode === 'push' ? 'bg-skyblue text-ink' : 'btn-ghost'}`} onClick={() => set(mode === 'push' ? 'idle' : 'push')}>
              🔵 Push it
            </button>
          </div>
          <Callout emoji="🍝" tone="grass" title="Try this at home">
            Hold one strand of dry spaghetti by its ends. Pull gently: it is surprisingly strong. Now push the ends together: it bows and snaps almost at once.
          </Callout>
        </div>
      </div>
    </section>
  )
}

function TriangleSection() {
  const pushRef = useRef(false)
  return (
    <section className="mb-12">
      <SectionTitle emoji="🔺" title="Why triangles?" subtitle="A square can lean over. A triangle cannot change shape without a side changing length." />
      <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr]">
        <LazyMount className="h-[340px] overflow-hidden rounded-blob shadow-float">
          <TriangleVsSquareScene pushRef={pushRef} />
        </LazyMount>
        <div className="card flex flex-col gap-4">
          <p className="prose-kid">
            Joints in a model bridge are like hinges. Push the top of a <strong>square</strong> and its sides swing: it folds into a parallelogram.
            Push a <strong>triangle</strong> and nothing moves, because three side lengths completely fix the three angles. That is why trusses are
            webs of triangles.
          </p>
          <button type="button" className="btn-primary self-start" onClick={() => (pushRef.current = true)}>
            👉 Push both frames
          </button>
          <Callout emoji="💡" tone="sun">
            Any four-sided shape in your bridge needs a diagonal. If the simulator says <em>“Wobbly!”</em>, go triangle hunting.
          </Callout>
        </div>
      </div>
    </section>
  )
}

function TypesSection() {
  const [kind, setKind] = useState<BridgeKind>('truss')
  const info = BRIDGE_KINDS.find((k) => k.id === kind)!
  return (
    <section className="mb-12">
      <SectionTitle emoji="🌉" title="Five ways to cross a gap" subtitle="Tap a type to see how it carries its load." />
      <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr]">
        <LazyMount className="h-[360px] overflow-hidden rounded-blob shadow-float">
          <BridgeTypesScene kind={kind} />
        </LazyMount>
        <div className="card">
          <div className="flex flex-wrap gap-2">
            {BRIDGE_KINDS.map((k) => (
              <button key={k.id} type="button" onClick={() => setKind(k.id)} className={`rounded-full px-3 py-1 font-display text-sm font-bold transition ${k.id === kind ? 'bg-ink text-white' : 'bg-ink/5 text-ink hover:bg-ink/10'}`}>
                {k.emoji} {k.name}
              </button>
            ))}
          </div>
          <h3 className="mt-4 font-display text-2xl font-bold">
            {info.emoji} {info.name}
          </h3>
          <p className="prose-kid mt-2">{info.how}</p>
          <p className="mt-3 text-sm font-bold text-ink-soft">Famous examples: {info.famous}</p>
          <Callout emoji="🧰" tone="sky" className="mt-4">
            In this lab you build <strong>trusses</strong>: they are the shape craft sticks and straws are happiest in.
          </Callout>
        </div>
      </div>
    </section>
  )
}

function BucklingSection() {
  const lengths = [5, 7.5, 10, 12.5, 15]
  const [material, setMaterial] = useState<keyof typeof MATERIALS>('stick')
  const data = useMemo(() => lengths.map((L) => ({ label: `${L} cm`, value: compressionLimitN(MATERIALS[material], L) / 9.81 })), [material])
  const byMaterial = useMemo(() => MATERIAL_LIST.map((m) => ({ label: m.name, value: compressionLimitN(m, 10) / 9.81, color: m.color })), [])
  return (
    <section className="mb-12">
      <SectionTitle emoji="📏" title="Long and thin = weak when pushed" subtitle="Buckling strength drops with the square of the length." />
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="card">
          <h3 className="font-display text-xl font-bold">How much push before one piece buckles?</h3>
          <div className="my-2 flex flex-wrap gap-2">
            {MATERIAL_LIST.map((m) => (
              <button key={m.id} type="button" onClick={() => setMaterial(m.id)} className={`rounded-full px-3 py-1 text-sm font-bold ${material === m.id ? 'bg-ink text-white' : 'bg-ink/5'}`}>
                {m.emoji} {m.name}
              </button>
            ))}
          </div>
          <BarChart data={data} yLabel="Buckling load (kg)" color={MATERIALS[material].color} digits={1} />
          <p className="mt-2 text-sm text-ink-soft">
            Halve the length and a pushed piece holds <strong>four times</strong> more. That is why short diagonals beat long ones.
          </p>
        </div>
        <div className="card">
          <h3 className="font-display text-xl font-bold">Same length (10 cm), different material</h3>
          <BarChart data={byMaterial} yLabel="Buckling load (kg)" digits={1} />
          <Callout emoji="🪵" tone="sun" className="mt-3">
            Glue two sticks face to face and the piece is twice as thick — but <strong>eight times</strong> harder to buckle. Thickness is the
            buckling superpower. Try the layers button in Build.
          </Callout>
        </div>
      </div>
    </section>
  )
}

function Glossary() {
  const words = [
    ['Tension', 'A pulling force that stretches a piece.'],
    ['Compression', 'A pushing force that squashes a piece.'],
    ['Buckling', 'When a pushed piece suddenly bows sideways and fails.'],
    ['Truss', 'A frame made of triangles.'],
    ['Chord', 'The long top or bottom pieces of a truss.'],
    ['Joint', 'Where pieces meet; in a model bridge, a blob of glue.'],
    ['Load', 'The weight the bridge has to carry.'],
    ['Efficiency', 'How many times its own weight a bridge can hold.'],
  ]
  return (
    <section>
      <SectionTitle emoji="🔤" title="Big words engineers use" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {words.map(([w, d]) => (
          <div key={w} className="card py-4">
            <div className="font-display text-lg font-bold text-grass-dark">{w}</div>
            <div className="text-ink">{d}</div>
          </div>
        ))}
      </div>
    </section>
  )
}
