import { Canvas, useFrame } from '@react-three/fiber'
import { useMemo, useRef, type RefObject } from 'react'
import { Color, DoubleSide, InstancedMesh, MeshStandardMaterial, Object3D } from 'three'
import { useInView } from '../../components/ui/LazyMount'

const MAX = 140
const R = 0.32
const H = 0.9
const BALL = 0.025

/**
 * Air is made of tiny molecules that zoom around and bump into the bottle walls.
 * Pumping squeezes MORE molecules into the same space, and they hit the walls harder and more often.
 * That's pressure. `strokesRef` = number of pump strokes (0-10).
 */
export function PressureScene({ strokesRef }: { strokesRef: RefObject<number> }) {
  const inView = useInView()
  return (
    <Canvas frameloop={inView ? 'always' : 'never'} dpr={[1, 1.5]} camera={{ fov: 40, position: [0.9, 0.5, 1.5] }}>
      <color attach="background" args={['#dff3ff']} />
      <ambientLight intensity={0.9} />
      <directionalLight position={[3, 4, 2]} intensity={1.2} />
      <Bottle strokesRef={strokesRef} />
    </Canvas>
  )
}

function Bottle({ strokesRef }: { strokesRef: RefObject<number> }) {
  const mesh = useRef<InstancedMesh>(null)
  const dummy = useMemo(() => new Object3D(), [])
  const data = useMemo(() => {
    const pos = new Float32Array(MAX * 3)
    const vel = new Float32Array(MAX * 3)
    for (let i = 0; i < MAX; i++) {
      const a = Math.random() * Math.PI * 2
      const rr = Math.random() * (R - BALL)
      pos[i * 3] = Math.cos(a) * rr
      pos[i * 3 + 1] = Math.random() * (H - 2 * BALL) + BALL
      pos[i * 3 + 2] = Math.sin(a) * rr
      const dir = Math.random() * Math.PI * 2
      const el = (Math.random() - 0.5) * Math.PI
      vel[i * 3] = Math.cos(dir) * Math.cos(el)
      vel[i * 3 + 1] = Math.sin(el)
      vel[i * 3 + 2] = Math.sin(dir) * Math.cos(el)
    }
    return { pos, vel }
  }, [])
  const cool = useMemo(() => new Color('#4cc9f0'), [])
  const hot = useMemo(() => new Color('#ff6b6b'), [])
  const tmpColor = useMemo(() => new Color(), [])

  useFrame((_, dtRaw) => {
    const m = mesh.current
    if (!m) return
    const dt = Math.min(dtRaw, 0.05)
    const strokes = Math.max(0, Math.min(10, strokesRef.current ?? 0))
    const active = Math.round(10 + strokes * 13)
    const speed = 0.35 + strokes * 0.11
    const { pos, vel } = data
    for (let i = 0; i < MAX; i++) {
      if (i >= active) {
        dummy.position.set(0, -10, 0)
        dummy.updateMatrix()
        m.setMatrixAt(i, dummy.matrix)
        continue
      }
      let x = pos[i * 3] + vel[i * 3] * speed * dt
      let y = pos[i * 3 + 1] + vel[i * 3 + 1] * speed * dt
      let z = pos[i * 3 + 2] + vel[i * 3 + 2] * speed * dt
      const rad = Math.hypot(x, z)
      if (rad > R - BALL) {
        const nx = x / rad
        const nz = z / rad
        const dot = vel[i * 3] * nx + vel[i * 3 + 2] * nz
        vel[i * 3] -= 2 * dot * nx
        vel[i * 3 + 2] -= 2 * dot * nz
        x = nx * (R - BALL)
        z = nz * (R - BALL)
      }
      if (y < BALL) {
        y = BALL
        vel[i * 3 + 1] = Math.abs(vel[i * 3 + 1])
      } else if (y > H - BALL) {
        y = H - BALL
        vel[i * 3 + 1] = -Math.abs(vel[i * 3 + 1])
      }
      pos[i * 3] = x
      pos[i * 3 + 1] = y
      pos[i * 3 + 2] = z
      dummy.position.set(x, y, z)
      dummy.updateMatrix()
      m.setMatrixAt(i, dummy.matrix)
    }
    tmpColor.copy(cool).lerp(hot, strokes / 10)
    ;(m.material as MeshStandardMaterial).color.copy(tmpColor)
    m.instanceMatrix.needsUpdate = true
  })

  return (
    <group position={[0, -0.4, 0]}>
      <mesh position={[0, H / 2, 0]}>
        <cylinderGeometry args={[R, R, H, 48, 1, true]} />
        <meshPhysicalMaterial color="#ffffff" transparent opacity={0.25} roughness={0.05} side={DoubleSide} />
      </mesh>
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[R, R, 0.01, 48]} />
        <meshStandardMaterial color="#1e2a4a" />
      </mesh>
      <mesh position={[0, H, 0]}>
        <cylinderGeometry args={[R, R, 0.01, 48]} />
        <meshPhysicalMaterial color="#ffffff" transparent opacity={0.4} />
      </mesh>
      <mesh position={[0, H + 0.08, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 0.16, 20]} />
        <meshStandardMaterial color="#845ec2" />
      </mesh>
      <instancedMesh ref={mesh} args={[undefined, undefined, MAX]}>
        <sphereGeometry args={[BALL, 10, 10]} />
        <meshStandardMaterial color="#4cc9f0" />
      </instancedMesh>
    </group>
  )
}
