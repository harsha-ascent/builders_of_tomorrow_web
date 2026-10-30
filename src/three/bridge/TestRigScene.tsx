import { OrbitControls, Text } from '@react-three/drei'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Suspense, useMemo, useRef, type RefObject } from 'react'
import { Group, Mesh, Vector3 } from 'three'
import type { BridgeAnalysis, BridgeDesign } from '../../../shared/types'
import { useInView } from '../../components/ui/LazyMount'
import { SPAN_CM, deckNodes } from '../../sim/bridge'
import { Bridge3D, CM, Cliffs, TRUSS_GAP, nodePosition, type RigState } from './Bridge3D'

export interface TestRigSceneProps {
  design: BridgeDesign
  analysis: BridgeAnalysis | null
  stateRef: RefObject<RigState>
  /** Load in kg currently applied; shown on the label. */
  loadKgRef: RefObject<number>
  colorMode?: 'material' | 'forces'
  highlightId?: string | null
  hoverId?: string | null
  /** Highlight colour (the Lab view's amber). */
  accent?: string
  onSelectMember?: (id: string) => void
  onHoverMember?: (id: string | null) => void
  /** Where along the road the load sits (cm), read every frame; default: mid-span bucket / worst-spot truck. */
  loadXRef?: RefObject<number>
  /** Dark background for the Lab view's instrument panel. */
  dark?: boolean
  /** 'orbit' lets the user spin the model; 'cinematic' slowly circles. */
  cameraMode?: 'orbit' | 'cinematic'
}

/** The 3-D test rig: a model bridge across two stacks of books, a bucket or a toy truck for the load. */
export function TestRigScene({
  design,
  analysis,
  stateRef,
  loadKgRef,
  colorMode = 'forces',
  highlightId = null,
  hoverId = null,
  accent,
  onSelectMember,
  onHoverMember,
  loadXRef,
  dark = false,
  cameraMode = 'cinematic',
}: TestRigSceneProps) {
  const inView = useInView()
  return (
    <Canvas frameloop={inView ? 'always' : 'never'} shadows dpr={[1, 1.5]} camera={{ fov: 35, near: 0.02, far: 20, position: [0.45, 0.28, 0.65] }}>
      <color attach="background" args={[dark ? '#0f141f' : '#eef7ff']} />
      <ambientLight intensity={dark ? 0.7 : 0.8} />
      <directionalLight position={[1, 1.5, 1]} intensity={1.6} castShadow shadow-mapSize={[1024, 1024]} />
      <hemisphereLight args={['#ffffff', '#c9b79a', 0.4]} />
      {/* Text labels load a font asynchronously; keep that suspension inside the canvas so the page never resets. */}
      <Suspense fallback={null}>
        <Cliffs />
        <Bridge3D
          design={design}
          analysis={analysis}
          stateRef={stateRef}
          colorMode={colorMode}
          highlightId={highlightId}
          hoverId={hoverId}
          accent={accent}
          onSelectMember={onSelectMember}
          onHoverMember={onHoverMember}
        />
        {design.loadMode === 'center' ? (
          <Bucket design={design} analysis={analysis} stateRef={stateRef} loadKgRef={loadKgRef} loadXRef={loadXRef} dark={dark} />
        ) : (
          <Truck design={design} analysis={analysis} stateRef={stateRef} loadKgRef={loadKgRef} loadXRef={loadXRef} dark={dark} />
        )}
        <Rig cameraMode={cameraMode} />
      </Suspense>
    </Canvas>
  )
}

function Rig({ cameraMode }: { cameraMode: 'orbit' | 'cinematic' }) {
  const { camera } = useThree()
  const t = useRef(0.6)
  const look = useMemo(() => new Vector3(SPAN_CM * CM * 0.5, 0.0, 0), [])
  useFrame((_, dt) => {
    if (cameraMode !== 'cinematic') return
    t.current += dt * 0.12
    const r = 0.72
    camera.position.set(SPAN_CM * CM * 0.5 + Math.sin(t.current) * r, 0.26, Math.cos(t.current) * r)
    camera.lookAt(look)
  })
  if (cameraMode === 'orbit') {
    return <OrbitControls target={[SPAN_CM * CM * 0.5, 0, 0]} enablePan={false} minDistance={0.3} maxDistance={1.6} maxPolarAngle={Math.PI / 2 - 0.05} makeDefault />
  }
  return null
}

function loadPoint(design: BridgeDesign, analysis: BridgeAnalysis | null, load: number, sag: number, xCm: number): [number, number] {
  const deck = deckNodes(design)
  for (let i = 0; i < deck.length - 1; i++) {
    const a = deck[i]
    const b = deck[i + 1]
    if (xCm >= a.x && xCm <= b.x) {
      const [ax, ay] = nodePosition(a, analysis, load, sag)
      const [bx, by] = nodePosition(b, analysis, load, sag)
      const t = b.x === a.x ? 0 : (xCm - a.x) / (b.x - a.x)
      return [ax + (bx - ax) * t, ay + (by - ay) * t]
    }
  }
  return [xCm * CM, 0]
}

/** A bucket hanging from the middle of the road by a string; it fills up as the load rises. */
type LoadProps = Pick<TestRigSceneProps, 'design' | 'analysis' | 'stateRef' | 'loadKgRef' | 'loadXRef' | 'dark'>

function Bucket({ design, analysis, stateRef, loadKgRef, loadXRef, dark }: LoadProps) {
  const group = useRef<Group>(null)
  const fill = useRef<Mesh>(null)
  const label = useRef<Group>(null)
  const string = useRef<Mesh>(null)
  const drop = useRef(0)
  const stringLen = 0.1
  useFrame((_, dt) => {
    const st = stateRef.current
    if (!st || !group.current) return
    const xCm = loadXRef?.current ?? SPAN_CM / 2
    const [x, y] = loadPoint(design, analysis, st.load, st.sagScale, xCm)
    if (st.brokenId) drop.current = Math.min(drop.current + dt * 0.6, 0.14)
    else drop.current = 0
    group.current.position.set(x, y - stringLen - drop.current, 0)
    if (fill.current) {
      const f = Math.max(0.02, Math.min(1, st.load))
      fill.current.scale.y = f
      fill.current.position.y = 0.012 + (0.05 * f) / 2
    }
    if (string.current) {
      string.current.visible = !st.brokenId
      string.current.position.set(x, y - stringLen / 2, 0)
      string.current.scale.y = stringLen
    }
    if (label.current) label.current.position.set(x, y + 0.26 * 0.5 + 0.08, 0)
  })
  const kg = loadKgRef.current ?? 0
  return (
    <>
      <mesh ref={string}>
        <cylinderGeometry args={[0.0012, 0.0012, 1, 6]} />
        <meshStandardMaterial color="#444" />
      </mesh>
      <group ref={group}>
        <mesh position={[0, -0.03, 0]} castShadow>
          <cylinderGeometry args={[0.034, 0.028, 0.06, 24, 1, true]} />
          <meshStandardMaterial color="#9aa3b8" metalness={0.5} roughness={0.4} side={2} />
        </mesh>
        <mesh position={[0, -0.059, 0]}>
          <cylinderGeometry args={[0.028, 0.028, 0.003, 24]} />
          <meshStandardMaterial color="#8894ad" metalness={0.5} roughness={0.4} />
        </mesh>
        <mesh ref={fill} position={[0, -0.03, 0]}>
          <cylinderGeometry args={[0.03, 0.026, 0.05, 24]} />
          <meshStandardMaterial color="#d9a066" roughness={1} />
        </mesh>
        <mesh position={[0, 0.0, 0]} rotation={[0, 0, 0]}>
          <torusGeometry args={[0.034, 0.002, 8, 32, Math.PI]} />
          <meshStandardMaterial color="#444" />
        </mesh>
      </group>
      <group ref={label}>
        <LoadLabel loadKgRef={loadKgRef} fallback={kg} dark={dark} />
      </group>
    </>
  )
}

/** A toy truck parked at the worst spot on the road (or driving to it); the Lab parks it where the load is. */
function Truck({ design, analysis, stateRef, loadKgRef, loadXRef, dark }: LoadProps) {
  const group = useRef<Group>(null)
  const label = useRef<Group>(null)
  const xRef = useRef<number | null>(null)
  const target = analysis?.worstLoadX ?? SPAN_CM / 2
  useFrame((_, dt) => {
    const st = stateRef.current
    if (!st || !group.current) return
    // drive in from the left as the load builds, park at the worst spot (or wherever the Lab puts the load)
    const want = loadXRef ? (loadXRef.current ?? target) : st.load <= 0 ? -6 : target
    if (xRef.current === null) xRef.current = loadXRef ? want : 0
    xRef.current += (want - xRef.current) * Math.min(1, dt * 2.5)
    const [x, y] = loadPoint(design, analysis, st.load, st.sagScale, Math.max(0, Math.min(SPAN_CM, xRef.current)))
    const px = xRef.current < 0 ? xRef.current * CM : x
    group.current.position.set(px, y + 0.004, 0)
    group.current.rotation.x = st.brokenId ? 0.5 : 0
    if (label.current) label.current.position.set(px, y + 0.14, 0)
  })
  return (
    <>
      <group ref={group}>
        <mesh position={[0, 0.02, 0]} castShadow>
          <boxGeometry args={[0.07, 0.03, 0.045]} />
          <meshStandardMaterial color="#ff6b6b" roughness={0.6} />
        </mesh>
        <mesh position={[0.028, 0.045, 0]} castShadow>
          <boxGeometry args={[0.03, 0.025, 0.04]} />
          <meshStandardMaterial color="#4cc9f0" roughness={0.6} />
        </mesh>
        {[
          [-0.022, 0.026],
          [0.022, 0.026],
          [-0.022, -0.026],
          [0.022, -0.026],
        ].map(([x, z], i) => (
          <mesh key={i} position={[x, 0.008, z]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.008, 0.008, 0.008, 16]} />
            <meshStandardMaterial color="#1e2a4a" />
          </mesh>
        ))}
      </group>
      <group ref={label}>
        <LoadLabel loadKgRef={loadKgRef} fallback={0} dark={dark} />
      </group>
    </>
  )
}

function LoadLabel({ loadKgRef, fallback, dark }: { loadKgRef: RefObject<number>; fallback: number; dark?: boolean }) {
  const ref = useRef<{ text: string } | null>(null)
  const lastUpdate = useRef(0)
  useFrame(({ clock }) => {
    // Re-laying out text is expensive: refresh the label at most ~6 times a second.
    if (clock.elapsedTime - lastUpdate.current < 0.16) return
    lastUpdate.current = clock.elapsedTime
    const kg = loadKgRef.current ?? fallback
    const txt = `${kg.toFixed(1)} kg`
    if (ref.current && ref.current.text !== txt) ref.current.text = txt
  })
  return (
    <Text ref={ref as never} fontSize={0.03} color={dark ? '#f5a623' : '#1e2a4a'} anchorX="center" anchorY="bottom" outlineWidth={0.002} outlineColor={dark ? '#0b0f17' : '#ffffff'}>
      {`${fallback.toFixed(1)} kg`}
    </Text>
  )
}

export { TRUSS_GAP }
