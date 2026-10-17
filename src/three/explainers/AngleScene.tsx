import { Line, Text } from '@react-three/drei'
import { Canvas, useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { Group, Quaternion, Vector3 } from 'three'
import type { LaunchResult, RocketDesign } from '../../../shared/types'
import { sampleAt, simulateLaunch } from '../../sim/rocket'
import { useInView } from '../../components/ui/LazyMount'
import { restPose, simOptionsFor } from '../launcherGeometry'
import { Rocket3D } from '../Rocket3D'

export const ANGLE_OPTIONS = [30, 45, 60, 75, 90] as const
export const ANGLE_COLORS: Record<number, string> = {
  30: '#ff6b6b',
  45: '#ffd93d',
  60: '#6bcb77',
  75: '#4cc9f0',
  90: '#845ec2',
}

export function useAngleFlights(design: RocketDesign) {
  return useMemo(() => {
    const out = new Map<number, LaunchResult>()
    for (const a of ANGLE_OPTIONS) {
      out.set(a, simulateLaunch({ ...design, launchAngleDeg: a }, { ...simOptionsFor(a), sampleIntervalS: 0.02 }))
    }
    return out
  }, [design])
}

/** Several arcs at once: pick an angle and watch a rocket fly it. */
export function AngleScene({ design, selected, flights }: { design: RocketDesign; selected: number; flights: Map<number, LaunchResult> }) {
  const inView = useInView()
  const span = useMemo(() => {
    let m = 10
    for (const f of flights.values()) m = Math.max(m, f.rangeM, f.maxHeightM)
    return m
  }, [flights])
  return (
    <Canvas frameloop={inView ? 'always' : 'never'} dpr={[1, 1.5]} camera={{ fov: 45, position: [span * 0.45, span * 0.55, span * 1.15], near: 0.1, far: 2000 }}>
      <color attach="background" args={['#dff3ff']} />
      <ambientLight intensity={0.9} />
      <directionalLight position={[20, 40, 20]} intensity={1.2} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[span * 0.4, 0, 0]}>
        <planeGeometry args={[span * 4, span * 4]} />
        <meshStandardMaterial color="#8fd98a" />
      </mesh>
      <gridHelper args={[span * 3, 30, '#4caf5a', '#a5e0a0']} position={[span * 0.4, 0.01, 0]} />
      {Array.from(flights.entries()).map(([angle, f]) => (
        <Arc key={angle} angle={angle} flight={f} highlight={angle === selected} />
      ))}
      <Flyer design={design} flight={flights.get(selected)!} angle={selected} />
      <LookAt target={[span * 0.4, span * 0.3, 0]} />
    </Canvas>
  )
}

function LookAt({ target }: { target: [number, number, number] }) {
  const v = useMemo(() => new Vector3(...target), [target])
  useFrame(({ camera }) => camera.lookAt(v))
  return null
}

function Arc({ angle, flight, highlight }: { angle: number; flight: LaunchResult; highlight: boolean }) {
  const pts = useMemo(() => {
    const step = Math.max(1, Math.floor(flight.samples.length / 120))
    const out: [number, number, number][] = []
    for (let i = 0; i < flight.samples.length; i += step) {
      const s = flight.samples[i]
      out.push([s.x, Math.max(s.y, 0.05), 0])
    }
    const l = flight.samples[flight.samples.length - 1]
    out.push([l.x, 0.05, 0])
    return out
  }, [flight])
  const apex = flight.samples.reduce((a, b) => (b.y > a.y ? b : a), flight.samples[0])
  return (
    <group>
      <Line points={pts} color={ANGLE_COLORS[angle]} lineWidth={highlight ? 4 : 1.5} transparent opacity={highlight ? 1 : 0.5} />
      <Text position={[apex.x, apex.y + 1.5, 0]} fontSize={Math.max(1.2, flight.maxHeightM / 18)} color={ANGLE_COLORS[angle]} anchorX="center" anchorY="bottom" outlineWidth={0.05} outlineColor="#ffffff">
        {`${angle}°`}
      </Text>
    </group>
  )
}

function Flyer({ design, flight, angle }: { design: RocketDesign; flight: LaunchResult; angle: number }) {
  const g = useRef<Group>(null)
  const t = useRef(0)
  const q = useMemo(() => new Quaternion(), [])
  const z = useMemo(() => new Vector3(0, 0, 1), [])
  const pose = restPose(angle)
  const scale = Math.max(2, flight.maxHeightM / 8)
  useFrame((_, dt) => {
    if (!g.current) return
    const last = flight.samples[flight.samples.length - 1].t
    t.current = (t.current + dt * 0.6) % (last + 1.2)
    const s = sampleAt(flight.samples, Math.min(t.current, last))
    g.current.position.set(s.x, Math.max(s.y, 0.05), 0)
    const spd = Math.hypot(s.vx, s.vy)
    const a = spd > 0.5 ? Math.atan2(s.vy, s.vx) - Math.PI / 2 : pose.rotZ
    q.setFromAxisAngle(z, a)
    g.current.quaternion.slerp(q, 0.2)
  })
  return (
    <group ref={g} scale={scale}>
      <Rocket3D design={design} water={0.3} />
    </group>
  )
}
