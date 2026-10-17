import { Float, Stars } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { useInView } from '../components/ui/LazyMount'
import { DEFAULT_DESIGN } from '../sim/presets'
import { Rocket3D } from './Rocket3D'

/** Spinning rocket for the home page hero. */
export function HeroRocket() {
  const inView = useInView()
  return (
    <Canvas frameloop={inView ? 'always' : 'never'} dpr={[1, 1.5]} camera={{ fov: 35, position: [0, 0.35, 1.6] }}>
      <ambientLight intensity={0.9} />
      <directionalLight position={[2, 3, 2]} intensity={1.4} />
      <Stars radius={30} depth={20} count={800} factor={3} fade speed={0.6} />
      <Float speed={2} rotationIntensity={0.6} floatIntensity={1.2}>
        <group position={[0, -0.25, 0]} rotation={[0.1, 0, -0.25]}>
          <Rocket3D design={{ ...DEFAULT_DESIGN, waterFraction: 0.4 }} />
        </group>
      </Float>
    </Canvas>
  )
}
