import { useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import type { BridgeAnalysis, BridgeDesign, BridgeMember, BridgeNode, MaterialId } from '../../../shared/types'
import { GRID_CM, MATERIALS, MAX_HEIGHT_CM, MIN_HEIGHT_CM, SPAN_CM, isSupport, layersOf, memberLengthCm, newMemberId, newNodeId } from '../../sim/bridge'

export type EditorTool = 'build' | 'move' | 'delete'

export interface TrussEditorProps {
  design: BridgeDesign
  analysis: BridgeAnalysis | null
  tool: EditorTool
  material: MaterialId
  layers: number
  showForces: boolean
  showSag: boolean
  selectedMember: string | null
  onSelectMember: (id: string | null) => void
  onChange: (patch: Pick<BridgeDesign, 'nodes' | 'members'>) => void
  onNotice?: (text: string) => void
}

// Drawing space in centimetres.
const X0 = -12
const X1 = SPAN_CM + 12
const Y0 = MIN_HEIGHT_CM - 4
const Y1 = MAX_HEIGHT_CM + 4
const PX = 12 // pixels per cm
const W = (X1 - X0) * PX
const H = (Y1 - Y0) * PX
const sx = (x: number) => (x - X0) * PX
const sy = (y: number) => (Y1 - y) * PX

export function TrussEditor({ design, analysis, tool, material, layers, showForces, showSag, selectedMember, onSelectMember, onChange, onNotice }: TrussEditorProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [pending, setPending] = useState<string | null>(null)
  const [hover, setHover] = useState<{ x: number; y: number } | null>(null)
  const [drag, setDrag] = useState<{ id: string; x: number; y: number } | null>(null)
  const nodes = useMemo(() => new Map(design.nodes.map((n) => [n.id, n])), [design.nodes])
  const util = useMemo(() => new Map((analysis?.members ?? []).map((m) => [m.id, m])), [analysis])
  const sag = showSag && analysis?.ok ? Math.min(40, 8 / Math.max(analysis.maxDeflectionMm, 0.2)) : 0

  const gridPoints = useMemo(() => {
    const pts: [number, number][] = []
    for (let x = 0; x <= SPAN_CM; x += GRID_CM) for (let y = MIN_HEIGHT_CM; y <= MAX_HEIGHT_CM; y += GRID_CM) pts.push([x, y])
    return pts
  }, [])

  function toCm(e: ReactPointerEvent): { x: number; y: number } | null {
    const svg = svgRef.current
    if (!svg) return null
    const rect = svg.getBoundingClientRect()
    const px = ((e.clientX - rect.left) / rect.width) * W
    const py = ((e.clientY - rect.top) / rect.height) * H
    const x = Math.round((px / PX + X0) / GRID_CM) * GRID_CM
    const y = Math.round((Y1 - py / PX) / GRID_CM) * GRID_CM
    if (x < 0 || x > SPAN_CM || y < MIN_HEIGHT_CM || y > MAX_HEIGHT_CM) return null
    return { x, y }
  }

  function nodeAt(x: number, y: number) {
    return design.nodes.find((n) => Math.abs(n.x - x) < 1e-6 && Math.abs(n.y - y) < 1e-6)
  }

  function displaced(n: BridgeNode): [number, number] {
    const d = analysis?.displacementsMm[n.id]
    if (!d || !sag) return [n.x, n.y]
    return [n.x + (d.dx / 10) * sag, n.y + (d.dy / 10) * sag]
  }

  function handlePointerDown(e: ReactPointerEvent) {
    const p = toCm(e)
    if (!p) {
      setPending(null)
      return
    }
    const existing = nodeAt(p.x, p.y)
    if (tool === 'build') {
      let id = existing?.id
      let nextNodes = design.nodes
      if (!id) {
        const n: BridgeNode = { id: newNodeId(), x: p.x, y: p.y }
        nextNodes = [...design.nodes, n]
        id = n.id
      }
      if (pending && pending !== id) {
        const len = memberLengthCm({ nodes: nextNodes }, { a: pending, b: id })
        const spec = MATERIALS[material]
        const dup = design.members.some((m) => (m.a === pending && m.b === id) || (m.a === id && m.b === pending))
        if (dup) {
          onNotice?.('There is already a piece there.')
        } else if (len > spec.maxLengthCm + 1e-6) {
          onNotice?.(`Too long! A ${spec.name.toLowerCase()} is at most ${spec.maxLengthCm} cm; that would be ${len.toFixed(1)} cm. Add a joint in between.`)
          if (!existing) nextNodes = design.nodes // do not leave an orphan joint
          id = pending
        } else {
          const m: BridgeMember = { id: newMemberId(), a: pending, b: id, material, layers }
          onChange({ nodes: nextNodes, members: [...design.members, m] })
          setPending(id)
          onSelectMember(null)
          return
        }
      }
      if (nextNodes !== design.nodes) onChange({ nodes: nextNodes, members: design.members })
      setPending(pending === id ? null : id)
      onSelectMember(null)
      return
    }
    if (tool === 'move' && existing && !isSupport(existing.id)) {
      setDrag({ id: existing.id, x: existing.x, y: existing.y })
      ;(e.target as Element).setPointerCapture?.(e.pointerId)
      return
    }
    if (tool === 'delete' && existing && !isSupport(existing.id)) {
      onChange({ nodes: design.nodes.filter((n) => n.id !== existing.id), members: design.members.filter((m) => m.a !== existing.id && m.b !== existing.id) })
      onSelectMember(null)
    }
  }

  function handlePointerMove(e: ReactPointerEvent) {
    const p = toCm(e)
    setHover(p)
    if (drag && p) {
      if (nodeAt(p.x, p.y) && !(p.x === drag.x && p.y === drag.y)) return // occupied
      if (p.x !== drag.x || p.y !== drag.y) {
        onChange({ nodes: design.nodes.map((n) => (n.id === drag.id ? { ...n, x: p.x, y: p.y } : n)), members: design.members })
        setDrag({ ...drag, x: p.x, y: p.y })
      }
    }
  }

  function handlePointerUp() {
    setDrag(null)
  }

  function clickMember(m: BridgeMember, e: ReactPointerEvent) {
    e.stopPropagation()
    if (tool === 'delete') {
      onChange({ nodes: design.nodes, members: design.members.filter((x) => x.id !== m.id) })
      onSelectMember(null)
      return
    }
    onSelectMember(selectedMember === m.id ? null : m.id)
    setPending(null)
  }

  const pendingNode = pending ? nodes.get(pending) : null

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${W} ${H}`}
      className={`h-auto w-full touch-none select-none rounded-2xl bg-[#eef7ff] ${tool === 'delete' ? 'cursor-not-allowed' : tool === 'move' ? 'cursor-move' : 'cursor-crosshair'}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={() => {
        setHover(null)
        setDrag(null)
      }}
      role="application"
      aria-label="Bridge design canvas"
    >
      {/* cliffs */}
      <rect x={0} y={sy(0)} width={sx(0)} height={H - sy(0)} fill="#c9a46c" />
      <rect x={sx(SPAN_CM)} y={sy(0)} width={W - sx(SPAN_CM)} height={H - sy(0)} fill="#c9a46c" />
      <rect x={0} y={sy(0) - 3} width={sx(0)} height={3} fill="#6bcb77" />
      <rect x={sx(SPAN_CM)} y={sy(0) - 3} width={W - sx(SPAN_CM)} height={3} fill="#6bcb77" />
      <text x={sx(-6)} y={sy(-6)} textAnchor="middle" fontSize={12} fontWeight={800} fill="#6b4f2a">
        cliff
      </text>
      <text x={sx(SPAN_CM + 6)} y={sy(-6)} textAnchor="middle" fontSize={12} fontWeight={800} fill="#6b4f2a">
        cliff
      </text>
      {/* water */}
      <rect x={sx(0)} y={sy(MIN_HEIGHT_CM - 2)} width={sx(SPAN_CM) - sx(0)} height={H - sy(MIN_HEIGHT_CM - 2)} fill="#9ad0f5" opacity={0.6} />
      {/* road level */}
      <line x1={sx(0)} x2={sx(SPAN_CM)} y1={sy(0)} y2={sy(0)} stroke="#1e2a4a" strokeOpacity={0.15} strokeDasharray="4 4" />
      {/* grid */}
      {gridPoints.map(([x, y]) => (
        <circle key={`${x},${y}`} cx={sx(x)} cy={sy(y)} r={hover && hover.x === x && hover.y === y ? 5 : 2.2} fill={hover && hover.x === x && hover.y === y ? '#ffd93d' : '#1e2a4a'} opacity={hover && hover.x === x && hover.y === y ? 1 : 0.25} />
      ))}
      {/* ruler */}
      {[0, 10, 20, 30, 40].map((x) => (
        <text key={x} x={sx(x)} y={H - 6} textAnchor="middle" fontSize={11} fontWeight={700} fill="#4a5578">
          {x} cm
        </text>
      ))}
      {/* members */}
      {design.members.map((m) => {
        const a = nodes.get(m.a)
        const b = nodes.get(m.b)
        if (!a || !b) return null
        const [ax, ay] = displaced(a)
        const [bx, by] = displaced(b)
        const u = util.get(m.id)
        let stroke = MATERIALS[m.material].color
        if (showForces && u && analysis?.ok) {
          const base = u.forceN >= 0 ? [255, 90, 90] : [59, 130, 246]
          const k = 0.2 + 0.8 * u.utilization
          const c = base.map((v) => Math.round(244 + (v - 244) * k))
          stroke = `rgb(${c[0]},${c[1]},${c[2]})`
        }
        const broken = analysis?.ok && analysis.firstToBreak === m.id
        const tooLong = analysis?.tooLongMembers.includes(m.id)
        const width = 4 + layersOf(m) * 3
        return (
          <g key={m.id} onPointerDown={(e) => clickMember(m, e)} className="cursor-pointer">
            <line x1={sx(ax)} y1={sy(ay)} x2={sx(bx)} y2={sy(by)} stroke="transparent" strokeWidth={16} />
            <line
              x1={sx(ax)}
              y1={sy(ay)}
              x2={sx(bx)}
              y2={sy(by)}
              stroke={stroke}
              strokeWidth={width}
              strokeLinecap="round"
              strokeDasharray={tooLong ? '6 6' : undefined}
              opacity={selectedMember && selectedMember !== m.id ? 0.55 : 1}
            />
            {selectedMember === m.id && <line x1={sx(ax)} y1={sy(ay)} x2={sx(bx)} y2={sy(by)} stroke="#ffd93d" strokeWidth={width + 6} strokeLinecap="round" opacity={0.6} />}
            {broken && <circle cx={sx((ax + bx) / 2)} cy={sy((ay + by) / 2)} r={9} fill="none" stroke="#1e2a4a" strokeWidth={3} strokeDasharray="3 3" />}
            <title>
              {`${MATERIALS[m.material].name}${layersOf(m) > 1 ? ` ×${layersOf(m)}` : ''}, ${memberLengthCm(design, m).toFixed(1)} cm` +
                (u && analysis?.ok ? ` · ${u.forceN >= 0 ? 'pulled' : 'pushed'} ${Math.abs(u.forceN).toFixed(1)} N (${Math.round(u.utilization * 100)}% of its limit)` : '')}
            </title>
          </g>
        )
      })}
      {/* pending rubber band */}
      {pendingNode && hover && (
        <line x1={sx(pendingNode.x)} y1={sy(pendingNode.y)} x2={sx(hover.x)} y2={sy(hover.y)} stroke={MATERIALS[material].color} strokeWidth={4 + layers * 3} strokeDasharray="6 6" opacity={0.6} pointerEvents="none" />
      )}
      {/* nodes */}
      {design.nodes.map((n) => {
        const [x, y] = displaced(n)
        const support = isSupport(n.id)
        const floating = analysis?.floatingNodes.includes(n.id)
        return (
          <g key={n.id} pointerEvents="none">
            {support ? (
              <polygon points={`${sx(x)},${sy(y)} ${sx(x) - 9},${sy(y) + 14} ${sx(x) + 9},${sy(y) + 14}`} fill="#1e2a4a" />
            ) : (
              <circle cx={sx(x)} cy={sy(y)} r={pending === n.id ? 8 : 6} fill={floating ? '#ff6b6b' : pending === n.id ? '#ffd93d' : '#ffffff'} stroke="#1e2a4a" strokeWidth={2.5} />
            )}
          </g>
        )
      })}
      {/* load marker */}
      {analysis?.ok && (
        <g pointerEvents="none">
          <text x={sx(design.loadMode === 'center' ? SPAN_CM / 2 : analysis.worstLoadX)} y={sy(0) - 12} textAnchor="middle" fontSize={20}>
            {design.loadMode === 'center' ? '🪣' : '🚚'}
          </text>
        </g>
      )}
      {!analysis?.ok && (
        <text x={sx(SPAN_CM / 2)} y={sy(0) - 12} textAnchor="middle" fontSize={20} pointerEvents="none">
          🪣
        </text>
      )}
    </svg>
  )
}
