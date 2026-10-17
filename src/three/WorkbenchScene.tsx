import { ContactShadows, OrbitControls } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import type { RocketDesign } from '../../shared/types'
import { useInView } from '../components/ui/LazyMount'
import { Launcher3D } from './Launcher3D'
import { restPose } from './launcherGeometry'
import { Rocket3D } from './Rocket3D'

/** Close-up of the rocket sitting on its launcher, for the Build tab. */
export function WorkbenchScene({ design, pressureKPa }: { design: RocketDesign; pressureKPa: number }) {
  const pose = restPose(design.launchAngleDeg)
  const inView = useInView()
  return (
    <Canvas frameloop={inView ? 'always' : 'never'} shadows dpr={[1, 1.5]} camera={{ fov: 40, near: 0.05, far: 100, position: [1.3, 0.85, 1.55] }}>
      <color attach="background" args={['#dff3ff']} />
      <ambientLight intensity={0.8} />
      <directionalLight position={[4, 6, 3]} intensity={1.6} castShadow shadow-mapSize={[1024, 1024]} />
      <hemisphereLight args={['#ffffff', '#88aa88', 0.4]} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.002, 0]} receiveShadow>
        <circleGeometry args={[4, 48]} />
        <meshStandardMaterial color="#8fd98a" />
      </mesh>
      <Launcher3D angleDeg={design.launchAngleDeg} pressureKPa={pressureKPa} />
      <group position={[pose.x, pose.y, 0]} rotation={[0, 0, pose.rotZ]}>
        <Rocket3D design={design} />
      </group>
      <ContactShadows position={[0, 0.001, 0]} opacity={0.35} scale={4} blur={2} far={2} />
      <OrbitControls
        target={[0.15, 0.55, 0]}
        enablePan={false}
        minDistance={0.8}
        maxDistance={4}
        maxPolarAngle={Math.PI / 2 - 0.05}
        makeDefault
      />
    </Canvas>
  )
}
