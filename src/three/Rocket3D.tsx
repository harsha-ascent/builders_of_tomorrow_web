import { Line } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { forwardRef, useMemo, useRef, type RefObject } from 'react'
import { DoubleSide, Group, Mesh, Shape } from 'three'
import type { NoseShape, RocketDesign, StageSpec } from '../../shared/types'
import { bottleSpec, stageList } from '../sim/rocket'

export interface StageDims {
  r: number
  neckR: number
  neckH: number
  shoulderH: number
  bodyH: number
  /** Height of the flat bottle top above this stage's nozzle. */
  top: number
}

/** Gap between a booster's top and the next stage's nozzle (the coupler). */
export const COUPLER_H = 0.015

export function stageDims(bottleVolumeL: number): StageDims {
  const spec = bottleSpec(bottleVolumeL)
  const r = spec.diameterM / 2
  const neckR = 0.011
  const neckH = 0.03
  const shoulderH = spec.heightM * 0.14
  const bodyH = spec.heightM * 0.78
  return { r, neckR, neckH, shoulderH, bodyH, top: neckH + shoulderH + bodyH }
}

export function noseHeight(shape: NoseShape, r: number) {
  return shape === 'pointy' ? r * 1.8 : shape === 'round' ? r : r * 0.25
}

export interface RocketDims extends StageDims {
  /** Absolute height of the top stage's flat top above the whole stack's nozzle. */
  top: number
  noseH: number
  total: number
  /** Nozzle height of each stage, bottom-first. */
  stageOffsets: number[]
  maxR: number
}

/** Dimensions of the whole stack; `r`, `neckH`, `shoulderH`, `bodyH` describe the top stage. */
export function rocketDims(design: RocketDesign): RocketDims {
  const stages = stageList(design)
  const offsets: number[] = []
  let y = 0
  let maxR = 0
  let topDims = stageDims(design.bottleVolumeL)
  stages.forEach((s, i) => {
    const d = stageDims(s.bottleVolumeL)
    offsets.push(y)
    maxR = Math.max(maxR, d.r)
    if (i === stages.length - 1) topDims = d
    else y += d.top + COUPLER_H
  })
  const top = y + topDims.top
  const noseH = noseHeight(design.noseShape, topDims.r)
  return { ...topDims, top, noseH, total: top + noseH, stageOffsets: offsets, maxR }
}

interface Rocket3DProps {
  design: RocketDesign
  /** Water level of the top stage as a fraction (0-1). Defaults to the design's setting. */
  water?: number
  /** Live water level for the top stage, read every frame (no React re-render). */
  waterRef?: RefObject<number>
  scale?: number
  /** Receives each booster's group so a scene can hide it after separation (index 0 = bottom). */
  onBoosterGroup?: (index: number, group: Group | null) => void
  /** Receives the parachute group (hidden until the scene shows it). */
  onChuteGroup?: (group: Group | null) => void
}

/** A water rocket (one to three stages) with its nozzle at the origin and its nose pointing up +Y. */
export function Rocket3D({ design, water, waterRef, scale = 1, onBoosterGroup, onChuteGroup }: Rocket3DProps) {
  const stages = useMemo(() => stageList(design), [design])
  const dims = useMemo(() => rocketDims(design), [design])
  const topIndex = stages.length - 1
  return (
    <group scale={scale}>
      {stages.map((s, i) => {
        const isTop = i === topIndex
        const body = (
          <StageBottle
            key={i}
            stage={s}
            water={isTop ? water : s.waterFraction}
            waterRef={isTop ? waterRef : undefined}
            bodyColor={design.bodyColor}
            finColor={design.finColor}
            finCount={isTop ? design.finCount : 3}
            finScale={isTop ? 1 : 1.15}
            nose={isTop ? { shape: design.noseShape, color: design.noseColor } : undefined}
            coupler={!isTop}
          />
        )
        return isTop ? (
          <group key={i} position={[0, dims.stageOffsets[i], 0]}>
            {body}
          </group>
        ) : (
          <group
            key={i}
            position={[0, dims.stageOffsets[i], 0]}
            ref={(g) => {
              onBoosterGroup?.(i, g)
            }}
          >
            {body}
          </group>
        )
      })}
      {design.recovery === 'parachute' && (
        <Parachute3D
          diameterM={design.parachuteDiameterM}
          position={[0, dims.total, 0]}
          ref={(g) => {
            onChuteGroup?.(g)
          }}
        />
      )}
    </group>
  )
}

interface StageBottleProps {
  stage: Pick<StageSpec, 'bottleVolumeL' | 'waterFraction'>
  water?: number
  waterRef?: RefObject<number>
  bodyColor: string
  finColor: string
  finCount: number
  finScale?: number
  nose?: { shape: NoseShape; color: string }
  coupler?: boolean
}

/** One bottle with neck at the bottom, optional nose cone on top, fins near the neck. */
export function StageBottle({ stage, water, waterRef, bodyColor, finColor, finCount, finScale = 1, nose, coupler }: StageBottleProps) {
  const d = useMemo(() => stageDims(stage.bottleVolumeL), [stage.bottleVolumeL])
  const level = Math.max(0, Math.min(1, water ?? stage.waterFraction))
  const noseH = nose ? noseHeight(nose.shape, d.r) : 0

  const finShape = useMemo(() => {
    const s = new Shape()
    const span = d.r * 1.1 * finScale
    const height = (d.shoulderH + d.bodyH * 0.35) * finScale
    s.moveTo(0, 0)
    s.lineTo(span, -d.neckH * 0.4)
    s.lineTo(span * 0.55, height * 0.55)
    s.lineTo(0, height)
    s.closePath()
    return s
  }, [d, finScale])

  const fins = Array.from({ length: finCount }, (_, i) => (i / finCount) * Math.PI * 2 + (finCount === 3 ? Math.PI / 6 : Math.PI / 4))

  return (
    <group>
      <mesh position={[0, d.neckH / 2, 0]} castShadow>
        <cylinderGeometry args={[d.neckR, d.neckR, d.neckH, 24]} />
        <meshStandardMaterial color="#2b2b2b" roughness={0.6} />
      </mesh>
      <mesh position={[0, d.neckH + d.shoulderH / 2, 0]} castShadow>
        <cylinderGeometry args={[d.r, d.neckR * 1.4, d.shoulderH, 32]} />
        <meshPhysicalMaterial color={bodyColor} transparent opacity={0.55} roughness={0.15} side={DoubleSide} />
      </mesh>
      <mesh position={[0, d.neckH + d.shoulderH + d.bodyH / 2, 0]} castShadow>
        <cylinderGeometry args={[d.r, d.r, d.bodyH, 32]} />
        <meshPhysicalMaterial color={bodyColor} transparent opacity={0.55} roughness={0.15} side={DoubleSide} />
      </mesh>
      <mesh position={[0, d.top, 0]}>
        <cylinderGeometry args={[d.r, d.r, 0.004, 32]} />
        <meshStandardMaterial color={bodyColor} roughness={0.3} />
      </mesh>
      <WaterMesh dims={d} level={level} waterRef={waterRef} />
      {coupler && (
        <mesh position={[0, d.top + COUPLER_H / 2, 0]}>
          <cylinderGeometry args={[d.neckR * 2.2, d.r * 0.5, COUPLER_H, 24]} />
          <meshStandardMaterial color="#5c6b8a" roughness={0.6} />
        </mesh>
      )}
      {nose?.shape === 'pointy' && (
        <mesh position={[0, d.top + noseH / 2, 0]} castShadow>
          <coneGeometry args={[d.r, noseH, 32]} />
          <meshStandardMaterial color={nose.color} roughness={0.4} />
        </mesh>
      )}
      {nose?.shape === 'round' && (
        <mesh position={[0, d.top, 0]} castShadow>
          <sphereGeometry args={[d.r, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color={nose.color} roughness={0.4} />
        </mesh>
      )}
      {nose?.shape === 'flat' && (
        <mesh position={[0, d.top + noseH / 2, 0]} castShadow>
          <cylinderGeometry args={[d.r * 0.92, d.r, noseH, 32]} />
          <meshStandardMaterial color={nose.color} roughness={0.4} />
        </mesh>
      )}
      {fins.map((a, i) => (
        <group key={i} rotation={[0, a, 0]}>
          <mesh position={[d.r * 0.92, d.neckH * 0.6, 0.002]} castShadow>
            <extrudeGeometry args={[finShape, { depth: 0.004, bevelEnabled: false }]} />
            <meshStandardMaterial color={finColor} roughness={0.5} side={DoubleSide} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

/** Water column inside a bottle. Scales in Y from the bottom of the body; follows `waterRef` every frame when given. */
function WaterMesh({ dims: d, level, waterRef }: { dims: StageDims; level: number; waterRef?: RefObject<number> }) {
  const mesh = useRef<Mesh>(null)
  const fullH = d.bodyH + d.shoulderH
  const heightFor = (lvl: number) => Math.max(Math.min(lvl, 1) * fullH - d.shoulderH, 0)
  const h0 = heightFor(level)
  useFrame(() => {
    const m = mesh.current
    if (!m || !waterRef) return
    const h = heightFor(waterRef.current ?? level)
    m.visible = h > 0.002
    m.scale.y = Math.max(h, 0.001)
    m.position.y = d.neckH + d.shoulderH + h / 2
  })
  return (
    <mesh ref={mesh} position={[0, d.neckH + d.shoulderH + h0 / 2, 0]} scale={[1, Math.max(h0, 0.001), 1]} visible={h0 > 0.002}>
      <cylinderGeometry args={[d.r * 0.96, d.r * 0.96, 1, 32]} />
      <meshPhysicalMaterial color="#3fb8e8" transparent opacity={0.8} roughness={0.05} />
    </mesh>
  )
}

/** Inflated canopy with shroud lines meeting at the group origin (the attach point on the rocket). */
export const Parachute3D = forwardRef<Group, { diameterM: number; position?: [number, number, number]; color?: string }>(
  function Parachute3D({ diameterM, position = [0, 0, 0], color = '#ff9f43' }, ref) {
    const rc = (diameterM / 2) * 0.72 // inflated radius
    const lineLen = diameterM * 0.95
    const canopyY = Math.sqrt(Math.max(lineLen * lineLen - rc * rc, 0.01))
    const segments = useMemo(() => {
      const pts: [number, number, number][] = []
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2
        pts.push([0, 0, 0], [Math.cos(a) * rc, canopyY, Math.sin(a) * rc])
      }
      return pts
    }, [rc, canopyY])
    return (
      <group ref={ref} position={position} visible={false}>
        <mesh position={[0, canopyY, 0]}>
          <sphereGeometry args={[rc, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color={color} side={DoubleSide} roughness={0.9} transparent opacity={0.92} />
        </mesh>
        <mesh position={[0, canopyY, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[rc * 0.98, rc, 24]} />
          <meshStandardMaterial color="#ffffff" side={DoubleSide} />
        </mesh>
        <Line points={segments} segments color="#ffffff" lineWidth={1} transparent opacity={0.8} />
      </group>
    )
  },
)
