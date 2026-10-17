import { useFrame } from '@react-three/fiber'
import { useMemo, useRef, type RefObject } from 'react'
import { CatmullRomCurve3, Group, Vector3 } from 'three'
import { LAUNCHER, restPose } from './launcherGeometry'

interface Launcher3DProps {
  angleDeg: number
  /** Gauge pressure in kPa; read every frame so the needle can animate. */
  pressureRef?: RefObject<number>
  /** Static pressure if no ref is given. */
  pressureKPa?: number
}

const MAX_GAUGE_KPA = 700

/** Tripod-style launcher with a tilting launch tube, bike pump, hose and a pressure gauge. */
export function Launcher3D({ angleDeg, pressureRef, pressureKPa = 0 }: Launcher3DProps) {
  const pose = restPose(angleDeg)
  const needle = useRef<Group>(null)

  useFrame(() => {
    if (!needle.current) return
    const p = pressureRef?.current ?? pressureKPa
    const f = Math.max(0, Math.min(1, p / MAX_GAUGE_KPA))
    needle.current.rotation.z = (Math.PI * 0.75) - f * Math.PI * 1.5
  })

  const hose = useMemo(() => {
    const curve = new CatmullRomCurve3([
      new Vector3(-0.62, 0.05, 0.3),
      new Vector3(-0.45, 0.02, 0.22),
      new Vector3(-0.2, 0.03, 0.1),
      new Vector3(-0.02, 0.06, 0.02),
      new Vector3(0, LAUNCHER.pivotHeight - 0.05, 0),
    ])
    return curve
  }, [])

  return (
    <group>
      {/* base plate */}
      <mesh position={[0, 0.02, 0]} receiveShadow castShadow>
        <boxGeometry args={[0.7, 0.04, 0.7]} />
        <meshStandardMaterial color="#5c6b8a" roughness={0.7} />
      </mesh>
      {/* feet */}
      {[
        [-0.3, 0.3],
        [0.3, 0.3],
        [-0.3, -0.3],
        [0.3, -0.3],
      ].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.005, z]}>
          <cylinderGeometry args={[0.04, 0.05, 0.01, 16]} />
          <meshStandardMaterial color="#2b2b2b" />
        </mesh>
      ))}
      {/* post */}
      <mesh position={[0, LAUNCHER.pivotHeight / 2, 0]} castShadow>
        <cylinderGeometry args={[0.02, 0.025, LAUNCHER.pivotHeight, 16]} />
        <meshStandardMaterial color="#8894ad" metalness={0.4} roughness={0.4} />
      </mesh>
      {/* pivot + tilting tube */}
      <group position={[0, LAUNCHER.pivotHeight, 0]} rotation={[0, 0, pose.rotZ]}>
        <mesh>
          <sphereGeometry args={[0.035, 16, 16]} />
          <meshStandardMaterial color="#ff6b6b" roughness={0.4} />
        </mesh>
        <mesh position={[0, LAUNCHER.tubeLength / 2, 0]} castShadow>
          <cylinderGeometry args={[0.009, 0.009, LAUNCHER.tubeLength, 16]} />
          <meshStandardMaterial color="#d9dde8" metalness={0.6} roughness={0.3} />
        </mesh>
        {/* release clamp around the rocket neck */}
        <mesh position={[0, LAUNCHER.rocketOffset - 0.01, 0]}>
          <torusGeometry args={[0.02, 0.006, 8, 24]} />
          <meshStandardMaterial color="#ffd93d" roughness={0.5} />
        </mesh>
      </group>
      {/* angle protractor plate */}
      <mesh position={[0, LAUNCHER.pivotHeight, -0.05]} rotation={[0, 0, 0]}>
        <circleGeometry args={[0.09, 32, 0, Math.PI]} />
        <meshStandardMaterial color="#ffffff" roughness={0.9} />
      </mesh>
      {/* gauge */}
      <group position={[0.26, 0.09, 0.26]} rotation={[-Math.PI / 3, 0, 0]}>
        <mesh>
          <cylinderGeometry args={[0.07, 0.07, 0.02, 32]} />
          <meshStandardMaterial color="#1e2a4a" />
        </mesh>
        <mesh position={[0, 0.011, 0]}>
          <cylinderGeometry args={[0.06, 0.06, 0.002, 32]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>
        <group ref={needle} position={[0, 0.014, 0]} rotation={[0, 0, Math.PI * 0.75]}>
          <mesh position={[0, 0.025, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <boxGeometry args={[0.004, 0.001, 0.05]} />
            <meshStandardMaterial color="#ff6b6b" />
          </mesh>
        </group>
        <mesh position={[0, 0.015, 0]}>
          <sphereGeometry args={[0.006, 12, 12]} />
          <meshStandardMaterial color="#1e2a4a" />
        </mesh>
      </group>
      {/* bike pump */}
      <group position={[-0.62, 0, 0.3]}>
        <mesh position={[0, 0.25, 0]} castShadow>
          <cylinderGeometry args={[0.028, 0.03, 0.5, 20]} />
          <meshStandardMaterial color="#845ec2" roughness={0.4} />
        </mesh>
        <mesh position={[0, 0.5, 0]}>
          <cylinderGeometry args={[0.012, 0.012, 0.12, 12]} />
          <meshStandardMaterial color="#d9dde8" metalness={0.6} />
        </mesh>
        <mesh position={[0, 0.57, 0]} castShadow>
          <boxGeometry args={[0.26, 0.03, 0.035]} />
          <meshStandardMaterial color="#1e2a4a" />
        </mesh>
        <mesh position={[0, 0.01, 0]}>
          <boxGeometry args={[0.18, 0.02, 0.06]} />
          <meshStandardMaterial color="#1e2a4a" />
        </mesh>
      </group>
      {/* hose */}
      <mesh>
        <tubeGeometry args={[hose, 40, 0.008, 8, false]} />
        <meshStandardMaterial color="#2b2b2b" roughness={0.8} />
      </mesh>
    </group>
  )
}
