import { Canvas, useFrame } from '@react-three/fiber'
import { useRef, type RefObject } from 'react'
import { Group } from 'three'
import { useInView } from '../../../components/ui/LazyMount'

/** Push the top of a square frame and it leans into a parallelogram; a triangle holds its shape. */
export function TriangleVsSquareScene({ pushRef }: { pushRef: RefObject<boolean> }) {
  const inView = useInView()
  return (
    <Canvas frameloop={inView ? 'always' : 'never'} dpr={[1, 1.5]} camera={{ fov: 35, position: [0, 0.14, 0.62] }}>
      <color attach="background" args={['#eef7ff']} />
      <ambientLight intensity={0.9} />
      <directionalLight position={[1, 2, 1]} intensity={1.3} />
      <Frames pushRef={pushRef} />
    </Canvas>
  )
}

const BAR = 0.012
const S = 0.14

function Bar({ from, to, color = '#d9a066' }: { from: [number, number]; to: [number, number]; color?: string }) {
  const len = Math.hypot(to[0] - from[0], to[1] - from[1])
  const ang = Math.atan2(to[1] - from[1], to[0] - from[0])
  return (
    <mesh position={[(from[0] + to[0]) / 2, (from[1] + to[1]) / 2, 0]} rotation={[0, 0, ang]} castShadow>
      <boxGeometry args={[len, BAR, BAR]} />
      <meshStandardMaterial color={color} roughness={0.8} />
    </mesh>
  )
}

function Frames({ pushRef }: { pushRef: RefObject<boolean> }) {
  const square = useRef<Group>(null)
  const top = useRef<Group>(null)
  const sideL = useRef<Group>(null)
  const sideR = useRef<Group>(null)
  const tri = useRef<Group>(null)
  const phase = useRef(0) // 0 idle; animating 0..1..0
  const dir = useRef(1)
  const t = useRef(0)

  useFrame((_, dt) => {
    if (pushRef.current && phase.current === 0) {
      phase.current = 1
      t.current = 0
    }
    pushRef.current = false
    if (phase.current === 1) {
      t.current += dt * dir.current * 1.4
      if (t.current >= 1) {
        t.current = 1
        dir.current = -1
      }
      if (t.current <= 0 && dir.current === -1) {
        t.current = 0
        dir.current = 1
        phase.current = 0
      }
    }
    const lean = t.current * 0.07 // metres the top slides sideways
    const angle = Math.asin(Math.min(1, lean / S))
    if (top.current) top.current.position.x = lean
    if (sideL.current) {
      sideL.current.rotation.z = -angle
      sideL.current.position.set(-S / 2, 0, 0)
    }
    if (sideR.current) {
      sideR.current.rotation.z = -angle
      sideR.current.position.set(S / 2, 0, 0)
    }
    if (tri.current) tri.current.rotation.z = Math.sin(t.current * Math.PI) * 0.015
  })

  return (
    <>
      {/* square frame (left) */}
      <group ref={square} position={[-0.17, -0.05, 0]}>
        <Bar from={[-S / 2, 0]} to={[S / 2, 0]} color="#845ec2" />
        <group ref={sideL}>
          <mesh position={[0, S / 2, 0]} castShadow>
            <boxGeometry args={[BAR, S, BAR]} />
            <meshStandardMaterial color="#d9a066" roughness={0.8} />
          </mesh>
        </group>
        <group ref={sideR}>
          <mesh position={[0, S / 2, 0]} castShadow>
            <boxGeometry args={[BAR, S, BAR]} />
            <meshStandardMaterial color="#d9a066" roughness={0.8} />
          </mesh>
        </group>
        <group ref={top} position={[0, S, 0]}>
          <Bar from={[-S / 2, 0]} to={[S / 2, 0]} />
        </group>
      </group>
      {/* triangle frame (right) */}
      <group ref={tri} position={[0.17, -0.05, 0]}>
        <Bar from={[-S / 2, 0]} to={[S / 2, 0]} color="#845ec2" />
        <Bar from={[-S / 2, 0]} to={[0, S]} />
        <Bar from={[S / 2, 0]} to={[0, S]} />
      </group>
      <mesh position={[0, -0.056, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[1.2, 1]} />
        <meshStandardMaterial color="#e8d8c0" />
      </mesh>
    </>
  )
}
