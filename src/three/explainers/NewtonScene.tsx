import { Canvas, useFrame } from '@react-three/fiber'
import { useRef, type RefObject } from 'react'
import { ArrowHelper, Group, Vector3 } from 'three'
import { useInView } from '../../components/ui/LazyMount'
import { DEFAULT_DESIGN } from '../../sim/presets'
import { Rocket3D } from '../Rocket3D'
import { WaterSpray, type SprayState } from '../WaterSpray'

/**
 * Newton's third law: when the rocket pushes water DOWN, the water pushes the rocket UP.
 * `pushRef.current = true` starts a push.
 */
export function NewtonScene({ pushRef }: { pushRef: RefObject<boolean> }) {
  const inView = useInView()
  return (
    <div className="relative h-full w-full">
      <Canvas frameloop={inView ? 'always' : 'never'} dpr={[1, 1.5]} camera={{ fov: 40, position: [1.3, 0.7, 2.0] }}>
        <color attach="background" args={['#dff3ff']} />
        <ambientLight intensity={0.9} />
        <directionalLight position={[3, 5, 2]} intensity={1.3} />
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <circleGeometry args={[5, 48]} />
          <meshStandardMaterial color="#8fd98a" />
        </mesh>
        <Demo pushRef={pushRef} />
      </Canvas>
      <div className="pointer-events-none absolute bottom-4 left-4 rounded-full bg-skyblue px-3 py-1 font-display text-sm font-bold text-ink shadow">
        ⬇️ Water pushed DOWN
      </div>
      <div className="pointer-events-none absolute right-4 top-4 rounded-full bg-rocket px-3 py-1 font-display text-sm font-bold text-white shadow">
        ⬆️ Rocket pushed UP
      </div>
    </div>
  )
}

function Demo({ pushRef }: { pushRef: RefObject<boolean> }) {
  const rocket = useRef<Group>(null)
  const downArrow = useRef<ArrowHelper>(null)
  const upArrow = useRef<ArrowHelper>(null)
  const state = useRef({ y: 0.25, vy: 0, pushing: 0 })
  const spray = useRef<SprayState>({ phase: 'ready', nozzle: new Vector3(), outDir: new Vector3(0, -1, 0), rocketVel: new Vector3() })

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05)
    const s = state.current
    if (pushRef.current && s.pushing <= 0 && s.y < 0.3) {
      s.pushing = 0.9
    }
    pushRef.current = false

    if (s.pushing > 0) {
      s.pushing -= dt
      s.vy += 6 * dt
      spray.current.phase = 'thrust'
    } else {
      s.vy -= 2.5 * dt
      spray.current.phase = 'ready'
    }
    s.y += s.vy * dt
    if (s.y < 0.25) {
      s.y = 0.25
      s.vy = 0
    }
    if (rocket.current) {
      rocket.current.position.y = s.y
      spray.current.nozzle.set(0, s.y, 0)
      spray.current.rocketVel.set(0, s.vy, 0)
    }
    const show = s.pushing > 0
    if (downArrow.current) {
      downArrow.current.visible = show
      downArrow.current.position.y = s.y - 0.02
    }
    if (upArrow.current) {
      upArrow.current.visible = show
      upArrow.current.position.y = s.y + 0.62
    }
  })

  return (
    <>
      <mesh position={[0, 0.01, 0]}>
        <cylinderGeometry args={[0.3, 0.32, 0.02, 32]} />
        <meshStandardMaterial color="#9aa3b8" />
      </mesh>
      <group ref={rocket} position={[0, 0.25, 0]}>
        <Rocket3D design={{ ...DEFAULT_DESIGN, finCount: 4 }} water={0.45} />
      </group>
      <WaterSpray stateRef={spray} rate={10} />
      <arrowHelper ref={downArrow} args={[new Vector3(0, -1, 0), new Vector3(0, 0.2, 0), 0.5, 0x2a9fd6, 0.14, 0.1]} />
      <arrowHelper ref={upArrow} args={[new Vector3(0, 1, 0), new Vector3(0, 0.9, 0), 0.5, 0xe04e4e, 0.14, 0.1]} />
    </>
  )
}
