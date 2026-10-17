import { useFrame } from '@react-three/fiber'
import { useMemo, useRef, type RefObject } from 'react'
import { BufferAttribute, BufferGeometry, Color, Points, PointsMaterial, Vector3 } from 'three'
import type { FlightPhase } from '../../shared/types'

export interface SprayState {
  phase: FlightPhase
  /** World position of the nozzle. */
  nozzle: Vector3
  /** Unit vector pointing out of the nozzle (down the rocket axis). */
  outDir: Vector3
  /** Rocket speed, so the spray trails nicely. */
  rocketVel: Vector3
}

const N = 500
const HIDDEN_Y = -1000

/** Simple particle jet for the water (blue) and leftover air (white) coming out of the nozzle. */
export function WaterSpray({ stateRef, rate = 14 }: { stateRef: RefObject<SprayState>; rate?: number }) {
  const points = useRef<Points>(null)
  const material = useRef<PointsMaterial>(null)
  const geometry = useMemo(() => {
    const g = new BufferGeometry()
    const pos = new Float32Array(N * 3)
    for (let i = 0; i < N; i++) pos[i * 3 + 1] = HIDDEN_Y
    g.setAttribute('position', new BufferAttribute(pos, 3))
    return g
  }, [])
  const vel = useMemo(() => new Float32Array(N * 3), [])
  const life = useMemo(() => new Float32Array(N), [])
  const cursor = useRef(0)
  const blue = useMemo(() => new Color('#5ad1f5'), [])
  const white = useMemo(() => new Color('#ffffff'), [])

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05)
    const s = stateRef.current
    const attr = geometry.getAttribute('position') as BufferAttribute
    const arr = attr.array as Float32Array

    const emitting = s && (s.phase === 'thrust' || s.phase === 'air')
    if (material.current && s) {
      material.current.color.copy(s.phase === 'air' ? white : blue)
      material.current.size = s.phase === 'air' ? 0.09 : 0.05
    }

    if (emitting) {
      const count = s.phase === 'air' ? Math.ceil(rate * 0.6) : rate
      for (let k = 0; k < count; k++) {
        const i = cursor.current
        cursor.current = (cursor.current + 1) % N
        const spread = s.phase === 'air' ? 0.5 : 0.18
        const speed = s.phase === 'air' ? 10 : 16
        arr[i * 3] = s.nozzle.x + (Math.random() - 0.5) * 0.01
        arr[i * 3 + 1] = s.nozzle.y + (Math.random() - 0.5) * 0.01
        arr[i * 3 + 2] = s.nozzle.z + (Math.random() - 0.5) * 0.01
        vel[i * 3] = s.outDir.x * speed + (Math.random() - 0.5) * speed * spread + s.rocketVel.x * 0.4
        vel[i * 3 + 1] = s.outDir.y * speed + (Math.random() - 0.5) * speed * spread + s.rocketVel.y * 0.4
        vel[i * 3 + 2] = s.outDir.z * speed + (Math.random() - 0.5) * speed * spread
        life[i] = 0.35 + Math.random() * 0.25
      }
    }

    for (let i = 0; i < N; i++) {
      if (life[i] <= 0) continue
      life[i] -= dt
      if (life[i] <= 0 || arr[i * 3 + 1] < 0) {
        arr[i * 3 + 1] = HIDDEN_Y
        life[i] = 0
        continue
      }
      vel[i * 3 + 1] -= 9.81 * dt
      arr[i * 3] += vel[i * 3] * dt
      arr[i * 3 + 1] += vel[i * 3 + 1] * dt
      arr[i * 3 + 2] += vel[i * 3 + 2] * dt
    }
    attr.needsUpdate = true
  })

  return (
    <points ref={points} geometry={geometry} frustumCulled={false}>
      <pointsMaterial ref={material} size={0.05} color="#5ad1f5" transparent opacity={0.9} depthWrite={false} sizeAttenuation />
    </points>
  )
}
