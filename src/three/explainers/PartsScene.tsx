import { OrbitControls } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import type { RocketDesign } from '../../../shared/types'
import { useInView } from '../../components/ui/LazyMount'
import { Launcher3D } from '../Launcher3D'
import { Anchor, LabelLayer, LabelProjector, labelStyle, useLabelRefs } from '../LabelOverlay'
import { LAUNCHER, restPose } from '../launcherGeometry'
import { Rocket3D, rocketDims } from '../Rocket3D'

export interface PartInfo {
  id: string
  name: string
  emoji: string
  job: string
  tip: string
}

export const ROCKET_PARTS: PartInfo[] = [
  { id: 'nose', name: 'Nose cone', emoji: '🔺', job: 'Cuts through the air so the rocket flies smoothly.', tip: 'A pointy or rounded nose has less drag than a flat one. Add a soft tip for safety!' },
  { id: 'body', name: 'Body (pressure bottle)', emoji: '🧴', job: 'Holds the water and the squeezed air. It is the fuel tank AND the engine.', tip: 'Only use fizzy-drink bottles. They are built to hold pressure.' },
  { id: 'fins', name: 'Fins', emoji: '🪽', job: 'Keep the rocket pointing forwards, like feathers on an arrow.', tip: '3 or 4 fins, spaced evenly, near the nozzle end. Stiff and straight!' },
  { id: 'nozzle', name: 'Nozzle', emoji: '⭕', job: 'The hole the water shoots out of. Water goes DOWN, rocket goes UP.', tip: 'A narrower nozzle makes a gentler, longer push.' },
  { id: 'tube', name: 'Launch tube', emoji: '📏', job: 'Guides the rocket straight for the first few centimetres.', tip: 'Longer tube = straighter start.' },
  { id: 'clamp', name: 'Release clamp', emoji: '🔒', job: 'Holds the rocket down while you pump, then lets go when you pull the cord.', tip: 'Always stand back before pulling!' },
  { id: 'gauge', name: 'Pressure gauge', emoji: '🕐', job: 'Shows how hard the air is pushing inside the bottle.', tip: 'Never go above the pressure your grown-up helper says is safe.' },
  { id: 'pump', name: 'Pump', emoji: '🫧', job: 'Squeezes more and more air into the bottle.', tip: 'Count your strokes so you can repeat a fair test!' },
  { id: 'base', name: 'Base', emoji: '🟦', job: 'Keeps the launcher steady and sets the launch angle.', tip: 'Peg it down on grass so it does not tip over.' },
]

const SHORT: Record<string, string> = {
  nose: '🔺 Nose cone',
  body: '🧴 Body',
  fins: '🪽 Fins',
  nozzle: '⭕ Nozzle',
  tube: '📏 Launch tube',
  clamp: '🔒 Clamp',
  gauge: '🕐 Gauge',
  pump: '🫧 Pump',
  base: '🟦 Base',
}

export function PartsScene({ design, selected, onSelect }: { design: RocketDesign; selected: string | null; onSelect: (id: string) => void }) {
  const inView = useInView()
  const pose = restPose(design.launchAngleDeg)
  const d = rocketDims(design)
  const { anchors, els } = useLabelRefs()
  return (
    <div className="relative h-full w-full">
      <Canvas frameloop={inView ? 'always' : 'never'} dpr={[1, 1.5]} camera={{ fov: 40, position: [1.5, 0.9, 1.7], near: 0.05 }}>
        <color attach="background" args={['#dff3ff']} />
        <ambientLight intensity={0.9} />
        <directionalLight position={[4, 6, 3]} intensity={1.4} />
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.002, 0]}>
          <circleGeometry args={[4, 48]} />
          <meshStandardMaterial color="#8fd98a" />
        </mesh>
        <Launcher3D angleDeg={design.launchAngleDeg} pressureKPa={300} />
        <group position={[pose.x, pose.y, 0]} rotation={[0, 0, pose.rotZ]}>
          <Rocket3D design={design} />
          <Anchor id="nose" anchors={anchors} position={[0, d.top + d.noseH + 0.04, 0]} />
          <Anchor id="body" anchors={anchors} position={[d.r + 0.06, d.neckH + d.shoulderH + d.bodyH * 0.6, 0]} />
          <Anchor id="fins" anchors={anchors} position={[-d.r - 0.1, d.neckH + 0.06, 0]} />
          <Anchor id="nozzle" anchors={anchors} position={[d.r + 0.04, -0.03, 0]} />
        </group>
        <group position={[0, LAUNCHER.pivotHeight, 0]} rotation={[0, 0, pose.rotZ]}>
          <Anchor id="tube" anchors={anchors} position={[-0.1, 0.02, 0]} />
          <Anchor id="clamp" anchors={anchors} position={[0.1, LAUNCHER.rocketOffset - 0.02, 0]} />
        </group>
        <Anchor id="gauge" anchors={anchors} position={[0.26, 0.2, 0.26]} />
        <Anchor id="pump" anchors={anchors} position={[-0.62, 0.7, 0.3]} />
        <Anchor id="base" anchors={anchors} position={[0, 0.03, 0.42]} />
        <LabelProjector anchors={anchors} els={els} />
        <OrbitControls target={[0, 0.45, 0]} enablePan={false} enableZoom={false} minDistance={0.9} maxDistance={4} autoRotate={inView} autoRotateSpeed={0.6} maxPolarAngle={Math.PI / 2 - 0.05} makeDefault />
      </Canvas>
      <LabelLayer>
        {ROCKET_PARTS.map((p) => (
          <button
            key={p.id}
            type="button"
            ref={(el) => {
              els.current[p.id] = el
            }}
            style={labelStyle}
            onClick={() => onSelect(p.id)}
            className={`pointer-events-auto whitespace-nowrap rounded-full border-2 px-3 py-1 font-display text-sm font-bold shadow transition-colors hover:scale-105 ${
              selected === p.id ? 'border-rocket bg-rocket text-white' : 'border-white bg-white/95 text-ink'
            }`}
          >
            {SHORT[p.id]}
          </button>
        ))}
      </LabelLayer>
    </div>
  )
}
