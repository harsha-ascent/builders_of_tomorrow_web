import { Line, OrbitControls } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { useMemo } from 'react'
import { useInView } from '../../../components/ui/LazyMount'

export type BridgeKind = 'beam' | 'arch' | 'truss' | 'suspension' | 'cable-stayed'

export const BRIDGE_KINDS: { id: BridgeKind; name: string; emoji: string; how: string; famous: string }[] = [
  { id: 'beam', name: 'Beam', emoji: '➖', how: 'A plank across a gap. The top gets squashed, the bottom gets stretched. Simple, but it sags fast as it gets longer.', famous: 'Most motorway overpasses' },
  { id: 'arch', name: 'Arch', emoji: '🌈', how: 'Pushes the load sideways into the ground. Almost everything is in compression, which stone and concrete love.', famous: 'Roman aqueducts, Sydney Harbour Bridge' },
  { id: 'truss', name: 'Truss', emoji: '🔺', how: 'A web of triangles. Each piece only pushes or pulls along its length, so thin pieces can carry big loads.', famous: 'Railway bridges, cranes, the Forth Bridge' },
  { id: 'suspension', name: 'Suspension', emoji: '🪢', how: 'The road hangs from giant cables draped over towers. Cables are only ever pulled, and steel is brilliant at being pulled.', famous: 'Golden Gate, Howrah (cantilever cousin)' },
  { id: 'cable-stayed', name: 'Cable-stayed', emoji: '🎻', how: 'Straight cables fan from a tower to the road like harp strings. Great for medium-long spans.', famous: 'Bandra–Worli Sea Link, Millau Viaduct' },
]

export function BridgeTypesScene({ kind }: { kind: BridgeKind }) {
  const inView = useInView()
  return (
    <Canvas frameloop={inView ? 'always' : 'never'} dpr={[1, 1.5]} camera={{ fov: 35, position: [0.5, 0.25, 0.8] }}>
      <color attach="background" args={['#eef7ff']} />
      <ambientLight intensity={0.9} />
      <directionalLight position={[1, 2, 1]} intensity={1.3} />
      <Model kind={kind} />
      <mesh position={[0, -0.09, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[2, 2]} />
        <meshStandardMaterial color="#9ad0f5" />
      </mesh>
      <OrbitControls enablePan={false} enableZoom={false} autoRotate autoRotateSpeed={0.8} target={[0, 0.03, 0]} maxPolarAngle={Math.PI / 2.1} />
    </Canvas>
  )
}

const DECK = '#5c6b8a'
const STONE = '#c9a46c'
const STEEL = '#ff6b6b'

function Pier({ x, h = 0.1 }: { x: number; h?: number }) {
  return (
    <mesh position={[x, -0.09 + h / 2, 0]} castShadow>
      <boxGeometry args={[0.06, h, 0.12]} />
      <meshStandardMaterial color={STONE} roughness={0.9} />
    </mesh>
  )
}

function Deck({ y = 0, len = 0.5 }: { y?: number; len?: number }) {
  return (
    <mesh position={[0, y, 0]} castShadow>
      <boxGeometry args={[len, 0.012, 0.1]} />
      <meshStandardMaterial color={DECK} roughness={0.7} />
    </mesh>
  )
}

function Model({ kind }: { kind: BridgeKind }) {
  const arch = useMemo(() => {
    const pts: [number, number, number][] = []
    for (let i = 0; i <= 24; i++) {
      const t = i / 24
      const x = -0.25 + 0.5 * t
      pts.push([x, -0.09 + 0.09 * Math.sin(Math.PI * t), 0])
    }
    return pts
  }, [])
  const cable = useMemo(() => {
    const pts: [number, number, number][] = []
    for (let i = 0; i <= 30; i++) {
      const t = i / 30
      const x = -0.3 + 0.6 * t
      const sagY = 0.22 - 0.2 * (1 - (2 * t - 1) ** 2)
      pts.push([x, sagY, 0])
    }
    return pts
  }, [])
  switch (kind) {
    case 'beam':
      return (
        <group>
          <Pier x={-0.25} />
          <Pier x={0.25} />
          <Deck />
        </group>
      )
    case 'arch':
      return (
        <group>
          <Pier x={-0.27} h={0.09} />
          <Pier x={0.27} h={0.09} />
          <Deck y={0.0} len={0.6} />
          {arch.map((p, i) =>
            i < arch.length - 1 ? (
              <mesh key={i} position={[(p[0] + arch[i + 1][0]) / 2, (p[1] + arch[i + 1][1]) / 2, 0]} rotation={[0, 0, Math.atan2(arch[i + 1][1] - p[1], arch[i + 1][0] - p[0])]}>
                <boxGeometry args={[0.025, 0.02, 0.1]} />
                <meshStandardMaterial color={STONE} roughness={0.9} />
              </mesh>
            ) : null,
          )}
          {[-0.15, -0.05, 0.05, 0.15].map((x) => (
            <mesh key={x} position={[x, -0.09 + 0.09 * Math.sin(Math.PI * ((x + 0.25) / 0.5)) + (0.09 - 0.09 * Math.sin(Math.PI * ((x + 0.25) / 0.5))) / 2, 0]}>
              <boxGeometry args={[0.012, 0.09 - 0.09 * Math.sin(Math.PI * ((x + 0.25) / 0.5)) + 0.0001, 0.08]} />
              <meshStandardMaterial color={STONE} />
            </mesh>
          ))}
        </group>
      )
    case 'truss': {
      const n = 5
      const w = 0.5 / n
      const h = 0.09
      const pts: [number, number, number][] = []
      for (let i = 0; i <= n; i++) {
        const x = -0.25 + i * w
        pts.push([x, 0, 0], [x, h, 0])
        if (i < n) pts.push([x, 0, 0], [x + w / 2, h, 0], [x + w / 2, h, 0], [x + w, 0, 0])
      }
      const top: [number, number, number][] = []
      for (let i = 0; i < n; i++) top.push([-0.25 + i * w + w / 2, h, 0], [-0.25 + (i + 1) * w - w / 2, h, 0])
      return (
        <group>
          <Pier x={-0.25} />
          <Pier x={0.25} />
          <Deck />
          {[-0.05, 0.05].map((z) => (
            <group key={z} position={[0, 0, z]}>
              <Line points={pts} segments color={STEEL} lineWidth={3} />
              <Line points={top} segments color={STEEL} lineWidth={3} />
            </group>
          ))}
        </group>
      )
    }
    case 'suspension':
      return (
        <group>
          <Pier x={-0.15} h={0.32} />
          <Pier x={0.15} h={0.32} />
          <Deck len={0.7} />
          {[-0.05, 0.05].map((z) => (
            <group key={z} position={[0, 0, z]}>
              <Line points={cable.map((p) => [p[0], -0.09 + 0.32 * 0 + p[1] - 0.0, p[2]] as [number, number, number])} color={STEEL} lineWidth={3} />
              {cable
                .filter((_, i) => i % 3 === 0)
                .map((p, i) => (
                  <Line key={i} points={[[p[0], p[1], 0], [p[0], 0.006, 0]]} color={STEEL} lineWidth={1.5} />
                ))}
            </group>
          ))}
        </group>
      )
    case 'cable-stayed':
      return (
        <group>
          <Pier x={0} h={0.36} />
          <Deck len={0.7} />
          {[-0.05, 0.05].map((z) => (
            <group key={z} position={[0, 0, z]}>
              {[-0.3, -0.22, -0.14, -0.07, 0.07, 0.14, 0.22, 0.3].map((x) => (
                <Line key={x} points={[[0, 0.25, 0], [x, 0.006, 0]]} color={STEEL} lineWidth={2} />
              ))}
            </group>
          ))}
        </group>
      )
  }
}
