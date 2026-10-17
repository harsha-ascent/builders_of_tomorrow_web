import { useFrame } from '@react-three/fiber'
import { useMemo, useRef, type RefObject } from 'react'
import { DoubleSide, Mesh, Shape } from 'three'
import type { RocketDesign } from '../../shared/types'
import { bottleSpec } from '../sim/rocket'

export interface RocketDims {
  r: number
  neckR: number
  neckH: number
  shoulderH: number
  bodyH: number
  top: number
  noseH: number
  total: number
}

export function rocketDims(design: Pick<RocketDesign, 'bottleVolumeL' | 'noseShape' | 'nozzleDiameterMm'>): RocketDims {
  const spec = bottleSpec(design.bottleVolumeL)
  const r = spec.diameterM / 2
  const neckR = 0.011
  const neckH = 0.03
  const shoulderH = spec.heightM * 0.14
  const bodyH = spec.heightM * 0.78
  const top = neckH + shoulderH + bodyH
  const noseH = design.noseShape === 'pointy' ? r * 1.8 : design.noseShape === 'round' ? r : r * 0.25
  return { r, neckR, neckH, shoulderH, bodyH, top, noseH, total: top + noseH }
}

interface Rocket3DProps {
  design: RocketDesign
  /** Water level as a fraction of the bottle (0-1). Defaults to the design's setting. */
  water?: number
  /** Multiplies every dimension; handy for the hero. */
  scale?: number
  /** Optional live water level (0-1) read every frame; overrides `water` while set. */
  waterRef?: RefObject<number>
}

/** A water rocket with its nozzle at the origin and its nose pointing up +Y. */
export function Rocket3D({ design, water, scale = 1, waterRef }: Rocket3DProps) {
  const { bottleVolumeL, noseShape, nozzleDiameterMm } = design
  const d = useMemo(() => rocketDims({ bottleVolumeL, noseShape, nozzleDiameterMm }), [bottleVolumeL, noseShape, nozzleDiameterMm])
  const level = Math.max(0, Math.min(1, water ?? design.waterFraction))

  const finShape = useMemo(() => {
    const s = new Shape()
    const span = d.r * 1.1
    const height = d.shoulderH + d.bodyH * 0.35
    s.moveTo(0, 0)
    s.lineTo(span, -d.neckH * 0.4)
    s.lineTo(span * 0.55, height * 0.55)
    s.lineTo(0, height)
    s.closePath()
    return s
  }, [d])

  const fins = Array.from({ length: design.finCount }, (_, i) => (i / design.finCount) * Math.PI * 2)

  return (
    <group scale={scale}>
      {/* nozzle / neck */}
      <mesh position={[0, d.neckH / 2, 0]} castShadow>
        <cylinderGeometry args={[d.neckR, d.neckR, d.neckH, 24]} />
        <meshStandardMaterial color="#2b2b2b" roughness={0.6} />
      </mesh>
      {/* shoulder: narrows down to the neck */}
      <mesh position={[0, d.neckH + d.shoulderH / 2, 0]} castShadow>
        <cylinderGeometry args={[d.r, d.neckR * 1.4, d.shoulderH, 32]} />
        <meshPhysicalMaterial color={design.bodyColor} transparent opacity={0.55} roughness={0.15} side={DoubleSide} />
      </mesh>
      {/* body */}
      <mesh position={[0, d.neckH + d.shoulderH + d.bodyH / 2, 0]} castShadow>
        <cylinderGeometry args={[d.r, d.r, d.bodyH, 32]} />
        <meshPhysicalMaterial color={design.bodyColor} transparent opacity={0.55} roughness={0.15} side={DoubleSide} />
      </mesh>
      {/* bottle base (the flat end), under the nose */}
      <mesh position={[0, d.top, 0]}>
        <cylinderGeometry args={[d.r, d.r, 0.004, 32]} />
        <meshStandardMaterial color={design.bodyColor} roughness={0.3} />
      </mesh>
      {/* water */}
      <WaterMesh dims={d} level={level} waterRef={waterRef} />
      {/* nose */}
      {design.noseShape === 'pointy' && (
        <mesh position={[0, d.top + d.noseH / 2, 0]} castShadow>
          <coneGeometry args={[d.r, d.noseH, 32]} />
          <meshStandardMaterial color={design.noseColor} roughness={0.4} />
        </mesh>
      )}
      {design.noseShape === 'round' && (
        <mesh position={[0, d.top, 0]} castShadow>
          <sphereGeometry args={[d.r, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color={design.noseColor} roughness={0.4} />
        </mesh>
      )}
      {design.noseShape === 'flat' && (
        <mesh position={[0, d.top + d.noseH / 2, 0]} castShadow>
          <cylinderGeometry args={[d.r * 0.92, d.r, d.noseH, 32]} />
          <meshStandardMaterial color={design.noseColor} roughness={0.4} />
        </mesh>
      )}
      {/* fins */}
      {fins.map((a, i) => (
        <group key={i} rotation={[0, a, 0]}>
          <mesh position={[d.r * 0.92, d.neckH * 0.6, 0.002]} rotation={[0, 0, 0]} castShadow>
            <extrudeGeometry args={[finShape, { depth: 0.004, bevelEnabled: false }]} />
            <meshStandardMaterial color={design.finColor} roughness={0.5} side={DoubleSide} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

function waterHeight(d: RocketDims, level: number) {
  return Math.max(level * (d.bodyH + d.shoulderH) - d.shoulderH * 0.5, 0)
}

/** Unit-height cylinder stretched to the current water level, updated per frame when a ref is given. */
function WaterMesh({ dims: d, level, waterRef }: { dims: RocketDims; level: number; waterRef?: RefObject<number> }) {
  const mesh = useRef<Mesh>(null)
  const apply = (lv: number) => {
    const m = mesh.current
    if (!m) return
    const h = waterHeight(d, lv)
    m.visible = h > 0.002
    m.scale.y = Math.max(h, 0.001)
    m.position.y = d.neckH + d.shoulderH + h / 2
  }
  useFrame(() => {
    if (waterRef) apply(waterRef.current ?? level)
  })
  const h0 = waterHeight(d, level)
  return (
    <mesh ref={mesh} position={[0, d.neckH + d.shoulderH + h0 / 2, 0]} scale={[1, Math.max(h0, 0.001), 1]} visible={h0 > 0.002}>
      <cylinderGeometry args={[d.r * 0.96, d.r * 0.96, 1, 32]} />
      <meshPhysicalMaterial color="#3fb8e8" transparent opacity={0.8} roughness={0.05} />
    </mesh>
  )
}
