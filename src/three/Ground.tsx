import { Grid, Sky, Text } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import type { Group } from 'three'

interface GroundProps {
  /** Draw distance flags every 10 m along +X up to this distance. 0 = none. */
  markersTo?: number
  /** Where to draw a landing target ring, in metres along +X. */
  targetDistance?: number | null
  trees?: boolean
  clouds?: boolean
  /** Dark "night range" look for the Lab view (floodlit pad, dim grid, no sky dome). */
  night?: boolean
}

export function Ground({ markersTo = 0, targetDistance = null, trees = true, clouds = true, night = false }: GroundProps) {
  const markers = useMemo(() => {
    const out: number[] = []
    for (let x = 10; x <= markersTo; x += 10) out.push(x)
    return out
  }, [markersTo])

  const treeSpots = useMemo(() => {
    const spots: { x: number; z: number; s: number }[] = []
    let seed = 7
    const rnd = () => {
      seed = (seed * 9301 + 49297) % 233280
      return seed / 233280
    }
    for (let i = 0; i < 26; i++) {
      const side = i % 2 === 0 ? 1 : -1
      spots.push({ x: -20 + rnd() * 160, z: side * (14 + rnd() * 40), s: 0.8 + rnd() * 1.2 })
    }
    return spots
  }, [])

  return (
    <group>
      {!night && <Sky distance={450000} sunPosition={[60, 40, -60]} turbidity={6} rayleigh={1.5} />}
      <ambientLight intensity={night ? 0.45 : 0.7} />
      <directionalLight position={[30, 50, 20]} intensity={night ? 1.1 : 1.6} color={night ? '#c9d6ff' : '#ffffff'} castShadow shadow-mapSize={[2048, 2048]} />
      <hemisphereLight args={night ? ['#2b3a5c', '#0f1a14', 0.7] : ['#bfe8ff', '#5aa65f', 0.5]} />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.001, 0]} receiveShadow>
        <circleGeometry args={[600, 64]} />
        <meshStandardMaterial color={night ? '#16231b' : '#7cc96c'} roughness={1} />
      </mesh>
      <Grid
        position={[0, 0.002, 0]}
        args={[400, 400]}
        cellSize={1}
        cellThickness={0.6}
        cellColor={night ? '#223a2c' : '#8fd98a'}
        sectionSize={10}
        sectionThickness={1.2}
        sectionColor={night ? '#3a6a4a' : '#4caf5a'}
        fadeDistance={night ? 220 : 160}
        fadeStrength={1.5}
        infiniteGrid
      />
      {/* launch pad */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.003, 0]} receiveShadow>
        <circleGeometry args={[1.4, 48]} />
        <meshStandardMaterial color={night ? '#3a4356' : '#9aa3b8'} roughness={0.9} />
      </mesh>

      {markers.map((x) => (
        <group key={x} position={[x, 0, 0]}>
          <mesh position={[0, 0.6, 0]}>
            <cylinderGeometry args={[0.02, 0.02, 1.2, 8]} />
            <meshStandardMaterial color="#ffffff" />
          </mesh>
          <mesh position={[0.18, 1.05, 0]}>
            <boxGeometry args={[0.36, 0.22, 0.01]} />
            <meshStandardMaterial color={x % 50 === 0 ? '#ff6b6b' : '#ffd93d'} />
          </mesh>
          <Text position={[0, 1.4, 0]} fontSize={Math.max(0.5, x / 40)} color={night ? '#e6ebf5' : '#1e2a4a'} anchorX="center" anchorY="bottom" outlineWidth={0.02} outlineColor={night ? '#0a0e16' : '#ffffff'}>
            {`${x} m`}
          </Text>
        </group>
      ))}

      {targetDistance != null && (
        <group position={[targetDistance, 0.01, 0]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[2.6, 3.2, 48]} />
            <meshStandardMaterial color="#ff6b6b" />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[1.4, 2.0, 48]} />
            <meshStandardMaterial color="#ffffff" />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.8, 32]} />
            <meshStandardMaterial color="#ff6b6b" />
          </mesh>
          <Text position={[0, 2.4, 0]} fontSize={1.4} color="#ff6b6b" anchorX="center" anchorY="bottom" outlineWidth={0.05} outlineColor="#ffffff">
            TARGET
          </Text>
        </group>
      )}

      {trees &&
        treeSpots.map((t, i) => (
          <group key={i} position={[t.x, 0, t.z]} scale={t.s}>
            <mesh position={[0, 0.6, 0]}>
              <cylinderGeometry args={[0.15, 0.2, 1.2, 8]} />
              <meshStandardMaterial color="#8b5a2b" />
            </mesh>
            <mesh position={[0, 2.2, 0]} castShadow>
              <coneGeometry args={[1.3, 3, 8]} />
              <meshStandardMaterial color={night ? (i % 3 === 0 ? '#1d3b26' : '#24492f') : i % 3 === 0 ? '#3f9b4d' : '#52b35f'} />
            </mesh>
          </group>
        ))}

      {clouds && <Clouds />}
    </group>
  )
}

function Clouds() {
  const ref = useRef<Group>(null)
  useFrame((_, dt) => {
    if (ref.current) ref.current.position.x = ((ref.current.position.x + dt * 0.6 + 100) % 200) - 100
  })
  const puffs = useMemo(
    () =>
      [
        [-40, 28, -50],
        [10, 34, -70],
        [60, 30, -45],
        [110, 36, -80],
        [-10, 32, 60],
        [70, 38, 70],
      ] as [number, number, number][],
    [],
  )
  return (
    <group ref={ref}>
      {puffs.map((p, i) => (
        <group key={i} position={p}>
          <mesh>
            <sphereGeometry args={[4, 12, 12]} />
            <meshStandardMaterial color="#ffffff" roughness={1} />
          </mesh>
          <mesh position={[4, -0.5, 0]}>
            <sphereGeometry args={[3, 12, 12]} />
            <meshStandardMaterial color="#ffffff" roughness={1} />
          </mesh>
          <mesh position={[-4, -0.8, 1]}>
            <sphereGeometry args={[2.6, 12, 12]} />
            <meshStandardMaterial color="#ffffff" roughness={1} />
          </mesh>
        </group>
      ))}
    </group>
  )
}
