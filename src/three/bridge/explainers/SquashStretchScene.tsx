import { Canvas, useFrame } from '@react-three/fiber'
import { useMemo, useRef, type RefObject } from 'react'
import { ArrowHelper, CatmullRomCurve3, Color, Mesh, MeshStandardMaterial, TubeGeometry, Vector3 } from 'three'
import { useInView } from '../../../components/ui/LazyMount'

export type SquashMode = 'idle' | 'pull' | 'push'

/** A craft stick held between two blocks. Pull it (tension) and it stretches; push it (compression) and it buckles. */
export function SquashStretchScene({ modeRef }: { modeRef: RefObject<SquashMode> }) {
  const inView = useInView()
  return (
    <Canvas frameloop={inView ? 'always' : 'never'} dpr={[1, 1.5]} camera={{ fov: 35, position: [0, 0.12, 0.5] }}>
      <color attach="background" args={['#eef7ff']} />
      <ambientLight intensity={0.9} />
      <directionalLight position={[1, 2, 1]} intensity={1.3} />
      <Demo modeRef={modeRef} />
    </Canvas>
  )
}

function Demo({ modeRef }: { modeRef: RefObject<SquashMode> }) {
  const stick = useRef<Mesh>(null)
  const left = useRef<Mesh>(null)
  const right = useRef<Mesh>(null)
  const arrowL = useRef<ArrowHelper>(null)
  const arrowR = useRef<ArrowHelper>(null)
  const amount = useRef(0) // -1 pushed … +1 pulled
  const L = 0.2
  const geomRef = useRef<TubeGeometry | null>(null)
  const red = useMemo(() => new MeshStandardMaterial({ color: '#d9a066', roughness: 0.8 }), [])
  const woodColor = useMemo(() => new Color('#d9a066'), [])
  const pullColor = useMemo(() => new Color('#ff5a5a'), [])
  const pushColor = useMemo(() => new Color('#3b82f6'), [])

  useFrame((_, dt) => {
    const mode = modeRef.current ?? 'idle'
    const target = mode === 'pull' ? 1 : mode === 'push' ? -1 : 0
    amount.current += (target - amount.current) * Math.min(1, dt * 4)
    const a = amount.current
    // block positions: pull moves them apart, push moves them together
    const gap = L / 2 + a * 0.012
    if (left.current) left.current.position.x = -gap - 0.03
    if (right.current) right.current.position.x = gap + 0.03
    // buckled shape when pushed
    const bow = Math.max(0, -a) * 0.05
    const curve = new CatmullRomCurve3([new Vector3(-gap, 0, 0), new Vector3(-gap / 2, bow * 0.8, 0), new Vector3(0, bow, 0), new Vector3(gap / 2, bow * 0.8, 0), new Vector3(gap, 0, 0)])
    const g = new TubeGeometry(curve, 24, 0.006, 8, false)
    if (stick.current) {
      stick.current.geometry.dispose()
      stick.current.geometry = g
      geomRef.current = g
      // fade from wood colour towards red (pulled) or blue (pushed)
      red.color.copy(woodColor).lerp(a > 0 ? pullColor : pushColor, Math.min(1, Math.abs(a)))
    }
    const show = Math.abs(a) > 0.05
    if (arrowL.current && arrowR.current) {
      arrowL.current.visible = show
      arrowR.current.visible = show
      const dirL = new Vector3(a > 0 ? -1 : 1, 0, 0)
      const dirR = new Vector3(a > 0 ? 1 : -1, 0, 0)
      arrowL.current.setDirection(dirL)
      arrowR.current.setDirection(dirR)
      arrowL.current.position.set(a > 0 ? -gap - 0.07 : -gap - 0.15, 0.05, 0)
      arrowR.current.position.set(a > 0 ? gap + 0.07 : gap + 0.15, 0.05, 0)
      arrowL.current.setColor(a > 0 ? 0xff5a5a : 0x3b82f6)
      arrowR.current.setColor(a > 0 ? 0xff5a5a : 0x3b82f6)
    }
  })

  return (
    <>
      <mesh ref={left} position={[-L / 2 - 0.03, 0, 0]} castShadow>
        <boxGeometry args={[0.06, 0.06, 0.06]} />
        <meshStandardMaterial color="#845ec2" roughness={0.7} />
      </mesh>
      <mesh ref={right} position={[L / 2 + 0.03, 0, 0]} castShadow>
        <boxGeometry args={[0.06, 0.06, 0.06]} />
        <meshStandardMaterial color="#845ec2" roughness={0.7} />
      </mesh>
      <mesh ref={stick} material={red}>
        <tubeGeometry args={[new CatmullRomCurve3([new Vector3(-L / 2, 0, 0), new Vector3(L / 2, 0, 0)]), 8, 0.006, 8, false]} />
      </mesh>
      <arrowHelper ref={arrowL} args={[new Vector3(-1, 0, 0), new Vector3(-0.17, 0.05, 0), 0.07, 0xff5a5a, 0.025, 0.015]} />
      <arrowHelper ref={arrowR} args={[new Vector3(1, 0, 0), new Vector3(0.17, 0.05, 0), 0.07, 0xff5a5a, 0.025, 0.015]} />
      <mesh position={[0, -0.05, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[1, 1]} />
        <meshStandardMaterial color="#e8d8c0" />
      </mesh>
    </>
  )
}
