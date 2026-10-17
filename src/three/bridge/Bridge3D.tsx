import { useFrame } from '@react-three/fiber'
import { useMemo, useRef, type RefObject } from 'react'
import { Color, Group, Mesh, MeshStandardMaterial } from 'three'
import type { BridgeAnalysis, BridgeDesign, BridgeNode } from '../../../shared/types'
import { MATERIALS, SPAN_CM, deckNodes, isSupport, layersOf, memberSection } from '../../sim/bridge'

/** 1 design centimetre = 1 cm in the scene (metres). */
export const CM = 0.01
/** Distance between the two trusses (z). */
export const TRUSS_GAP = 0.08

export interface RigState {
  /** Fraction of the breaking load currently applied, 0-1 (may exceed 1 briefly when breaking). */
  load: number
  /** Member that has snapped, if any. */
  brokenId: string | null
  /** How much to exaggerate the sag so it is visible. */
  sagScale: number
}

export interface Bridge3DProps {
  design: BridgeDesign
  analysis: BridgeAnalysis | null
  /** Live load state; the bridge reads it every frame (no React re-renders). */
  stateRef: RefObject<RigState>
  colorMode?: 'material' | 'forces'
  /** Which member is highlighted (e.g. selected in the editor). */
  highlightId?: string | null
}

const TENSION = new Color('#ff5a5a')
const COMPRESSION = new Color('#3b82f6')
const WHITE = new Color('#f4f4f4')
const BROKEN = new Color('#1e2a4a')
const HILITE = new Color('#ffd93d')

function nodeMap(design: BridgeDesign) {
  const m = new Map<string, BridgeNode>()
  for (const n of design.nodes) m.set(n.id, n)
  return m
}

/** Position of a node in metres, including the (exaggerated) displacement at the current load. */
export function nodePosition(n: BridgeNode, analysis: BridgeAnalysis | null, load: number, sagScale: number): [number, number] {
  const d = analysis?.displacementsMm[n.id]
  const f = Math.min(load, 1.5)
  const dx = d ? (d.dx / 1000) * sagScale * f : 0
  const dy = d ? (d.dy / 1000) * sagScale * f : 0
  return [n.x * CM + dx, n.y * CM + dy]
}

/**
 * The whole bridge: two identical trusses, deck planks between the road joints and small cross ties.
 * Members are boxes whose length, position and colour are updated every frame from `stateRef`.
 */
export function Bridge3D({ design, analysis, stateRef, colorMode = 'forces', highlightId = null }: Bridge3DProps) {
  const nodes = useMemo(() => nodeMap(design), [design])
  const deck = useMemo(() => deckNodes(design), [design])
  const util = useMemo(() => {
    const m = new Map<string, { utilization: number; forceN: number }>()
    for (const r of analysis?.members ?? []) m.set(r.id, { utilization: r.utilization, forceN: r.forceN })
    return m
  }, [analysis])

  const memberMeshes = useRef<Map<string, Mesh[]>>(new Map())
  const brokenHalves = useRef<Map<string, Group[]>>(new Map())
  const plankMeshes = useRef<Mesh[]>([])
  const tieMeshes = useRef<Mesh[]>([])
  const tmpColor = useMemo(() => new Color(), [])

  useFrame(() => {
    const st = stateRef.current
    if (!st) return
    const load = analysis?.ok ? st.load : 0
    const sag = st.sagScale

    for (const m of design.members) {
      const a = nodes.get(m.a)
      const b = nodes.get(m.b)
      if (!a || !b) continue
      const [ax, ay] = nodePosition(a, analysis, load, sag)
      const [bx, by] = nodePosition(b, analysis, load, sag)
      const len = Math.hypot(bx - ax, by - ay)
      const ang = Math.atan2(by - ay, bx - ax)
      const u = util.get(m.id)
      const isBroken = st.brokenId === m.id

      // colour
      const mat = MATERIALS[m.material]
      if (colorMode === 'forces' && u && analysis?.ok) {
        const strength = Math.min(1, u.utilization * Math.min(load, 1))
        tmpColor.copy(WHITE).lerp(u.forceN >= 0 ? TENSION : COMPRESSION, 0.15 + 0.85 * strength)
      } else {
        tmpColor.set(mat.color)
      }
      if (highlightId === m.id) tmpColor.lerp(HILITE, 0.6)
      if (isBroken) tmpColor.copy(BROKEN)

      const meshes = memberMeshes.current.get(m.id) ?? []
      const halves = brokenHalves.current.get(m.id) ?? []
      for (let i = 0; i < meshes.length; i++) {
        const mesh = meshes[i]
        mesh.visible = !isBroken
        mesh.position.set((ax + bx) / 2, (ay + by) / 2, mesh.position.z)
        mesh.rotation.z = ang
        mesh.scale.x = Math.max(len, 0.001)
        ;(mesh.material as MeshStandardMaterial).color.copy(tmpColor)
      }
      for (let i = 0; i < halves.length; i++) {
        const g = halves[i]
        g.visible = isBroken
        if (!isBroken) continue
        // each half hinges at its own end and droops
        const fromA = i % 2 === 0
        g.position.set(fromA ? ax : bx, fromA ? ay : by, g.position.z)
        g.rotation.z = ang + (fromA ? -0.45 : Math.PI + 0.45)
        g.scale.x = Math.max(len / 2, 0.001)
        const mesh = g.children[0] as Mesh
        ;(mesh.material as MeshStandardMaterial).color.copy(BROKEN)
      }
    }

    // deck planks and ties follow the road joints
    for (let i = 0; i < deck.length - 1; i++) {
      const [ax, ay] = nodePosition(deck[i], analysis, load, sag)
      const [bx, by] = nodePosition(deck[i + 1], analysis, load, sag)
      const plank = plankMeshes.current[i]
      if (plank) {
        plank.position.set((ax + bx) / 2, (ay + by) / 2 + 0.004, 0)
        plank.rotation.z = Math.atan2(by - ay, bx - ax)
        plank.scale.x = Math.max(Math.hypot(bx - ax, by - ay) - 0.004, 0.001)
      }
    }
    for (let i = 0; i < deck.length; i++) {
      const tie = tieMeshes.current[i]
      if (!tie) continue
      const [x, y] = nodePosition(deck[i], analysis, load, sag)
      tie.position.set(x, y, 0)
    }
  })

  return (
    <group>
      {design.members.map((m) => {
        const sec = memberSection(m)
        const thick = 0.004 * layersOf(m)
        const wide = m.material === 'stick' ? 0.01 : m.material === 'straw' ? 0.006 : 0.004
        void sec
        return (
          <group key={m.id}>
            {[-TRUSS_GAP / 2, TRUSS_GAP / 2].map((z, i) => (
              <mesh
                key={i}
                position={[0, 0, z]}
                castShadow
                ref={(el) => {
                  const list = memberMeshes.current.get(m.id) ?? []
                  list[i] = el as Mesh
                  memberMeshes.current.set(m.id, list)
                }}
              >
                <boxGeometry args={[1, wide, thick]} />
                <meshStandardMaterial color={MATERIALS[m.material].color} roughness={0.8} />
              </mesh>
            ))}
            {/* broken halves: two per truss */}
            {[-TRUSS_GAP / 2, -TRUSS_GAP / 2, TRUSS_GAP / 2, TRUSS_GAP / 2].map((z, i) => (
              <group
                key={`h${i}`}
                position={[0, 0, z]}
                visible={false}
                ref={(el) => {
                  const list = brokenHalves.current.get(m.id) ?? []
                  list[i] = el as Group
                  brokenHalves.current.set(m.id, list)
                }}
              >
                <mesh position={[0.5, 0, 0]}>
                  <boxGeometry args={[1, wide, thick]} />
                  <meshStandardMaterial color="#1e2a4a" roughness={0.8} />
                </mesh>
              </group>
            ))}
          </group>
        )
      })}
      {deck.slice(0, -1).map((_, i) => (
        <mesh
          key={`p${i}`}
          castShadow
          ref={(el) => {
            plankMeshes.current[i] = el as Mesh
          }}
        >
          <boxGeometry args={[1, 0.003, TRUSS_GAP + 0.02]} />
          <meshStandardMaterial color="#c9a46c" roughness={0.9} />
        </mesh>
      ))}
      {deck.map((n, i) => (
        <mesh
          key={`t${n.id}`}
          ref={(el) => {
            tieMeshes.current[i] = el as Mesh
          }}
          visible={!isSupport(n.id)}
        >
          <boxGeometry args={[0.006, 0.006, TRUSS_GAP]} />
          <meshStandardMaterial color="#8b6b3e" roughness={0.9} />
        </mesh>
      ))}
    </group>
  )
}

/** The gap the bridge crosses: two book-stack "cliffs" on a table. */
export function Cliffs({ height = 0.12 }: { height?: number }) {
  const w = 0.14
  const colors = ['#ff6b6b', '#4cc9f0', '#ffd93d', '#845ec2', '#6bcb77']
  const books = (x: number) =>
    Array.from({ length: 4 }, (_, i) => (
      <mesh key={i} position={[x, -height + (i + 0.5) * (height / 4), 0]} castShadow receiveShadow>
        <boxGeometry args={[w - i * 0.004, height / 4 - 0.002, TRUSS_GAP + 0.14 - i * 0.01]} />
        <meshStandardMaterial color={colors[i % colors.length]} roughness={0.85} />
      </mesh>
    ))
  return (
    <group>
      {books(-w / 2 + 0.01)}
      {books(SPAN_CM * CM + w / 2 - 0.01)}
      {/* table top */}
      <mesh position={[SPAN_CM * CM * 0.5, -height - 0.012, 0]} receiveShadow>
        <boxGeometry args={[1.6, 0.024, 0.9]} />
        <meshStandardMaterial color="#e8d8c0" roughness={0.9} />
      </mesh>
    </group>
  )
}
