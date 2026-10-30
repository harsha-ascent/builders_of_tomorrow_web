/**
 * Model-bridge structural analysis for the Bridge Builder workshop.
 *
 * Bridges are 2-D pin-jointed trusses built from classroom materials (craft sticks, straws, spaghetti,
 * balsa) on a centimetre grid. We use the direct stiffness method: assemble the global stiffness matrix,
 * apply the test load and self-weight, solve for joint displacements, then read off each member's force.
 * Because everything is linear until something breaks, one solve tells us the exact load at which the first
 * member fails in tension (glue joint lets go) or compression (Euler buckling or crushing).
 */
import type { BridgeAnalysis, BridgeDesign, BridgeMember, BridgeNode, FailureMode, LoadMode, MaterialId, MemberResult } from '../../shared/types'

export const GRID_CM = 5
/** Distance between the two supports (the gap to cross). */
export const SPAN_CM = 40
export const MAX_HEIGHT_CM = 20
export const MIN_HEIGHT_CM = -15
export const LEFT_SUPPORT_ID = 'L'
export const RIGHT_SUPPORT_ID = 'R'
export const G = 9.81
export const DEFAULT_BUDGET = 60

export interface MaterialSpec {
  id: MaterialId
  name: string
  emoji: string
  color: string
  /** Young's modulus, Pa. */
  E: number
  /** Cross-section area, m². */
  areaM2: number
  /** Second moment of area about the weak axis, m⁴ (controls buckling). */
  iM4: number
  /** Glue/tape joint strength in tension, N. */
  tensionLimitN: number
  /** Short-column crushing limit, N. */
  crushLimitN: number
  /** Longest piece you can buy, cm. */
  maxLengthCm: number
  massPerM: number
  costPerCm: number
  blurb: string
}

/**
 * Properties are rounded real-world values for the classroom items, with joint strengths set by the glue
 * or tape, which is what actually fails first in model bridges.
 */
export const MATERIALS: Record<MaterialId, MaterialSpec> = {
  stick: {
    id: 'stick',
    name: 'Craft stick',
    emoji: '🪵',
    color: '#d9a066',
    E: 10e9,
    areaM2: 20e-6, // 10 mm × 2 mm
    iM4: 6.67e-12,
    tensionLimitN: 150,
    crushLimitN: 400,
    maxLengthCm: 15,
    massPerM: 0.012,
    costPerCm: 0.2,
    blurb: 'Strong and stiff. Glue joints give way around 15 kg of pull.',
  },
  balsa: {
    id: 'balsa',
    name: 'Balsa strip',
    emoji: '🟫',
    color: '#e8c9a0',
    E: 3.5e9,
    areaM2: 9e-6, // 3 mm × 3 mm
    iM4: 6.75e-12,
    tensionLimitN: 60,
    crushLimitN: 100,
    maxLengthCm: 30,
    massPerM: 0.0015,
    costPerCm: 0.15,
    blurb: 'Feather-light and long. Snaps if you pull too hard.',
  },
  straw: {
    id: 'straw',
    name: 'Straw',
    emoji: '🥤',
    color: '#ff9f43',
    E: 2e9,
    areaM2: 2.76e-6, // Ø6 mm tube, 0.15 mm wall
    iM4: 1.18e-11,
    tensionLimitN: 40,
    crushLimitN: 60,
    maxLengthCm: 20,
    massPerM: 0.0025,
    costPerCm: 0.05,
    blurb: 'Cheap and bendy. Long straws buckle at the slightest push.',
  },
  spaghetti: {
    id: 'spaghetti',
    name: 'Spaghetti',
    emoji: '🍝',
    color: '#f2d16b',
    E: 4e9,
    areaM2: 2.54e-6, // Ø1.8 mm
    iM4: 5.15e-13,
    tensionLimitN: 25,
    crushLimitN: 80,
    maxLengthCm: 25,
    massPerM: 0.006,
    costPerCm: 0.03,
    blurb: 'Surprisingly strong in tension, hopeless in compression. Bundle it!',
  },
}

export const MATERIAL_LIST = Object.values(MATERIALS)

export const supportNodes = (): BridgeNode[] => [
  { id: LEFT_SUPPORT_ID, x: 0, y: 0 },
  { id: RIGHT_SUPPORT_ID, x: SPAN_CM, y: 0 },
]

export function isSupport(id: string) {
  return id === LEFT_SUPPORT_ID || id === RIGHT_SUPPORT_ID
}

export const MAX_LAYERS = 3

export function layersOf(m: Pick<BridgeMember, 'layers'>) {
  const n = Math.round(m.layers ?? 1)
  return Math.min(MAX_LAYERS, Math.max(1, n))
}

/** Effective section properties of a member made of `layers` pieces glued face-to-face. */
export function memberSection(m: Pick<BridgeMember, 'material' | 'layers'>) {
  const mat = MATERIALS[m.material]
  const n = layersOf(m)
  return {
    mat,
    layers: n,
    EA: mat.E * mat.areaM2 * n,
    // Stacking face-to-face multiplies the thickness, and I grows with thickness cubed.
    EI: mat.E * mat.iM4 * n ** 3,
    tensionLimitN: mat.tensionLimitN * n,
    crushLimitN: mat.crushLimitN * n,
    massPerM: mat.massPerM * n,
    costPerCm: mat.costPerCm * n,
  }
}

export function memberLengthCm(design: Pick<BridgeDesign, 'nodes'>, m: Pick<BridgeMember, 'a' | 'b'>): number {
  const a = design.nodes.find((n) => n.id === m.a)
  const b = design.nodes.find((n) => n.id === m.b)
  if (!a || !b) return 0
  return Math.hypot(b.x - a.x, b.y - a.y)
}

/** Euler buckling load for a pinned-pinned strut, capped by crushing. */
export function compressionLimitN(mat: MaterialSpec, lengthCm: number, layers = 1) {
  const L = Math.max(lengthCm, 0.1) / 100
  const n = Math.min(MAX_LAYERS, Math.max(1, Math.round(layers)))
  const euler = (Math.PI ** 2 * mat.E * mat.iM4 * n ** 3) / (L * L)
  return Math.min(euler, mat.crushLimitN * n)
}

export function bridgeMassG(design: Pick<BridgeDesign, 'nodes' | 'members'>) {
  return design.members.reduce((s, m) => s + (memberLengthCm(design, m) / 100) * memberSection(m).massPerM * 1000, 0)
}

export function bridgeCostCoins(design: Pick<BridgeDesign, 'nodes' | 'members'>) {
  return design.members.reduce((s, m) => s + memberLengthCm(design, m) * memberSection(m).costPerCm, 0)
}

/** Deck nodes (on the road, y = 0) sorted left to right, supports included. */
export function deckNodes(design: Pick<BridgeDesign, 'nodes'>): BridgeNode[] {
  return design.nodes.filter((n) => Math.abs(n.y) < 1e-6 && n.x >= 0 && n.x <= SPAN_CM).sort((a, b) => a.x - b.x)
}

const EMPTY: BridgeAnalysis = {
  ok: false,
  message: '',
  capacityN: 0,
  capacityKg: 0,
  firstToBreak: null,
  failureMode: null,
  worstLoadX: SPAN_CM / 2,
  members: [],
  displacementsMm: {},
  maxDeflectionMm: 0,
  massG: 0,
  costCoins: 0,
  efficiency: 0,
  floatingNodes: [],
  tooLongMembers: [],
}

// ---- Linear model -----------------------------------------------------------

interface MemberLimits {
  /** Tension limit (the glue joint), N. */
  T: number
  /** Compression limit (Euler buckling capped by crushing), N. */
  C: number
  /** True when buckling, not crushing, sets C. */
  euler: boolean
}

/** How the bridge answers one newton of test load placed `x` cm along the deck. */
export interface UnitResponse {
  x: number
  /** Force in each member per newton of load (N/N, + tension), in `BridgeModel.members` order. */
  unitN: number[]
  /** Joint displacements per newton of load (m), in dof order. */
  uUnit: Float64Array
  /** Test load (N) at which the first member fails; Infinity when the load sits right on a support. */
  lambda: number
  /** Index of that member in `members`, and how it fails. */
  idx: number
  mode: FailureMode
}

/**
 * The assembled and factorised stiffness model of a bridge that passed every sanity check. The analysis
 * is linear, so one factorisation answers any load at any position: `unitAt(x)` is one back-substitution.
 */
export interface BridgeModel {
  ok: true
  deck: BridgeNode[]
  members: BridgeMember[]
  lengthsM: number[]
  limits: MemberLimits[]
  /** Member forces (N, + tension) and joint displacements (m) from self-weight alone. */
  selfN: number[]
  uSelf: Float64Array
  index: Map<string, number>
  massG: number
  costCoins: number
  unitAt: (xLoadCm: number) => UnitResponse
}

export type BridgeModelResult = BridgeModel | { ok: false; analysis: BridgeAnalysis }

/** Checks the design and assembles the model; `ok: false` carries the analysis that explains the problem. */
export function buildBridgeModel(design: BridgeDesign): BridgeModelResult {
  const nodes = design.nodes
  const members = design.members.filter((m) => m.a !== m.b && nodes.some((n) => n.id === m.a) && nodes.some((n) => n.id === m.b))
  const massG = bridgeMassG({ nodes, members })
  const costCoins = bridgeCostCoins({ nodes, members })
  const base: BridgeAnalysis = { ...EMPTY, massG, costCoins }
  const fail = (analysis: BridgeAnalysis): BridgeModelResult => ({ ok: false, analysis })

  if (members.length === 0) return fail({ ...base, problem: 'empty', message: 'Add some pieces! Start by connecting the two cliffs along the road.' })

  // Members longer than the material allows.
  const tooLongMembers = members.filter((m) => memberLengthCm(design, m) > MATERIALS[m.material].maxLengthCm + 1e-6).map((m) => m.id)
  if (tooLongMembers.length) {
    const m = members.find((x) => x.id === tooLongMembers[0])!
    return fail({
      ...base,
      problem: 'too-long',
      tooLongMembers,
      message: `A ${MATERIALS[m.material].name.toLowerCase()} can only be ${MATERIALS[m.material].maxLengthCm} cm long. Split the long piece with a joint in the middle.`,
    })
  }

  // The road must run all the way across.
  const deck = deckNodes(design)
  for (let i = 0; i < deck.length - 1; i++) {
    const a = deck[i]
    const b = deck[i + 1]
    const joined = members.some((m) => (m.a === a.id && m.b === b.id) || (m.a === b.id && m.b === a.id))
    if (!joined) {
      return fail({ ...base, problem: 'no-deck', message: `Your road has a gap between ${a.x} cm and ${b.x} cm. Cars would fall in!` })
    }
  }

  // Everything must hang together from the supports.
  const adj = new Map<string, Set<string>>()
  for (const m of members) {
    if (!adj.has(m.a)) adj.set(m.a, new Set())
    if (!adj.has(m.b)) adj.set(m.b, new Set())
    adj.get(m.a)!.add(m.b)
    adj.get(m.b)!.add(m.a)
  }
  const seen = new Set<string>([LEFT_SUPPORT_ID])
  const stack = [LEFT_SUPPORT_ID]
  while (stack.length) {
    const n = stack.pop()!
    for (const o of adj.get(n) ?? []) {
      if (!seen.has(o)) {
        seen.add(o)
        stack.push(o)
      }
    }
  }
  const used = [...adj.keys()]
  const floatingNodes = used.filter((id) => !seen.has(id))
  if (floatingNodes.length) {
    return fail({ ...base, problem: 'disconnected', floatingNodes, message: 'Some pieces are floating in mid-air. Connect every piece back to the bridge.' })
  }

  // A joint with only one member just swings: that is a mechanism.
  const dangling = used.filter((id) => !isSupport(id) && (adj.get(id)?.size ?? 0) < 2)
  if (dangling.length) {
    const n = nodes.find((x) => x.id === dangling[0])!
    return fail({ ...base, problem: 'dangling', floatingNodes: dangling, message: `The joint at (${n.x}, ${n.y}) has only one piece. Every joint needs at least two.` })
  }

  // ---- Direct stiffness method -----------------------------------------
  const index = new Map<string, number>()
  used.forEach((id, i) => index.set(id, i))
  const n = used.length
  const dof = 2 * n
  const K = new Float64Array(dof * dof)
  const pos = (id: string) => nodes.find((x) => x.id === id)!

  interface MInfo {
    m: BridgeMember
    L: number
    c: number
    s: number
    k: number
    ia: number
    ib: number
  }
  const infos: MInfo[] = members.map((m) => {
    const a = pos(m.a)
    const b = pos(m.b)
    const L = Math.hypot(b.x - a.x, b.y - a.y) / 100
    const c = (b.x - a.x) / 100 / L
    const s = (b.y - a.y) / 100 / L
    const k = memberSection(m).EA / L
    return { m, L, c, s, k, ia: index.get(m.a)!, ib: index.get(m.b)! }
  })
  for (const { c, s, k, ia, ib } of infos) {
    const cc = c * c
    const ss = s * s
    const cs = c * s
    const local = [
      [cc, cs, -cc, -cs],
      [cs, ss, -cs, -ss],
      [-cc, -cs, cc, cs],
      [-cs, -ss, cs, ss],
    ]
    const map = [2 * ia, 2 * ia + 1, 2 * ib, 2 * ib + 1]
    for (let r = 0; r < 4; r++) for (let q = 0; q < 4; q++) K[map[r] * dof + map[q]] += k * local[r][q]
  }

  // Loads: self-weight (per member, split to its ends) and a unit test load.
  const fSelf = new Float64Array(dof)
  for (const { m, L, ia, ib } of infos) {
    const w = L * memberSection(m).massPerM * G
    fSelf[2 * ia + 1] -= w / 2
    fSelf[2 * ib + 1] -= w / 2
  }

  const fixed = new Set<number>([2 * index.get(LEFT_SUPPORT_ID)!, 2 * index.get(LEFT_SUPPORT_ID)! + 1, 2 * index.get(RIGHT_SUPPORT_ID)! + 1])
  const free: number[] = []
  for (let i = 0; i < dof; i++) if (!fixed.has(i)) free.push(i)
  const nf = free.length
  const Kff = new Float64Array(nf * nf)
  for (let r = 0; r < nf; r++) for (let q = 0; q < nf; q++) Kff[r * nf + q] = K[free[r] * dof + free[q]]

  const lu = luDecompose(Kff, nf)
  if (!lu) {
    return fail({ ...base, problem: 'mechanism', message: 'Wobbly! Your bridge can fold up like a parallelogram. Add diagonal pieces to make triangles.' })
  }

  const solveFull = (f: Float64Array) => {
    const ff = new Float64Array(nf)
    for (let r = 0; r < nf; r++) ff[r] = f[free[r]]
    const uf = luSolve(lu, nf, ff)
    const u = new Float64Array(dof)
    for (let r = 0; r < nf; r++) u[free[r]] = uf[r]
    return u
  }
  const memberForces = (u: Float64Array) =>
    infos.map(({ c, s, k, ia, ib }) => k * ((u[2 * ib] - u[2 * ia]) * c + (u[2 * ib + 1] - u[2 * ia + 1]) * s))

  const uSelf = solveFull(fSelf)
  const selfN = memberForces(uSelf)

  const limits: MemberLimits[] = infos.map(({ m, L }) => {
    const sec = memberSection(m)
    const C = compressionLimitN(sec.mat, L * 100, sec.layers)
    return { T: sec.tensionLimitN, C, euler: C < sec.crushLimitN - 1e-9 }
  })

  const unitAt = (xLoadCm: number): UnitResponse => {
    const fUnit = new Float64Array(dof)
    distributeLoad(deck, xLoadCm, (nodeId, share) => {
      const i = index.get(nodeId)
      if (i !== undefined) fUnit[2 * i + 1] -= share
    })
    const uUnit = solveFull(fUnit)
    const unitN = memberForces(uUnit)
    let lambda = Infinity
    let idx = -1
    let mode: FailureMode = 'tension'
    for (let i = 0; i < infos.length; i++) {
      const f0 = selfN[i]
      const f1 = unitN[i]
      const { T, C, euler } = limits[i]
      if (f0 > T || -f0 > C) {
        lambda = 0
        idx = i
        mode = 'self-weight'
        break
      }
      let li = Infinity
      let mi: FailureMode = 'tension'
      if (f1 > 1e-9) {
        li = (T - f0) / f1
        mi = 'tension'
      } else if (f1 < -1e-9) {
        li = (-C - f0) / f1
        mi = euler ? 'buckling' : 'crush'
      }
      if (li < lambda) {
        lambda = li
        idx = i
        mode = mi
      }
    }
    return { x: xLoadCm, unitN, uUnit, lambda, idx, mode }
  }

  return { ok: true, deck, members, lengthsM: infos.map((i) => i.L), limits, selfN, uSelf, index, massG, costCoins, unitAt }
}

/** The full analysis for a load at `r.x`: forces, utilisation and displacements at the breaking load. */
export function analysisAt(model: BridgeModel, r: UnitResponse): BridgeAnalysis {
  const atSupport = !Number.isFinite(r.lambda)
  const lambda = atSupport ? 0 : r.lambda
  const results: MemberResult[] = model.members.map((m, i) => {
    const f = model.selfN[i] + lambda * r.unitN[i]
    const { T, C } = model.limits[i]
    const lim = f >= 0 ? T : C
    return {
      id: m.id,
      lengthCm: Math.round(model.lengthsM[i] * 1000) / 10,
      forceN: Math.round(f * 100) / 100,
      tensionLimitN: Math.round(T * 10) / 10,
      compressionLimitN: Math.round(C * 10) / 10,
      utilization: Math.min(1, Math.abs(f) / Math.max(lim, 1e-9)),
    }
  })

  const displacementsMm: Record<string, { dx: number; dy: number }> = {}
  let maxDeflectionMm = 0
  for (const [id, i] of model.index) {
    const dx = (model.uSelf[2 * i] + lambda * r.uUnit[2 * i]) * 1000
    const dy = (model.uSelf[2 * i + 1] + lambda * r.uUnit[2 * i + 1]) * 1000
    displacementsMm[id] = { dx: round(dx, 2), dy: round(dy, 2) }
    maxDeflectionMm = Math.max(maxDeflectionMm, Math.abs(dy))
  }

  const capacityKg = lambda / G
  return {
    ok: true,
    message: atSupport
      ? 'The load sits right over a support, so the bridge barely feels it.'
      : lambda === 0
        ? 'It collapses under its own weight!'
        : `Holds about ${capacityKg.toFixed(1)} kg before the first piece fails.`,
    capacityN: atSupport ? Infinity : round(lambda, 2),
    capacityKg: atSupport ? Infinity : round(capacityKg, 2),
    firstToBreak: atSupport ? null : (model.members[r.idx]?.id ?? null),
    failureMode: atSupport ? null : r.mode,
    worstLoadX: r.x,
    members: results,
    displacementsMm,
    maxDeflectionMm: round(maxDeflectionMm, 2),
    massG: round(model.massG, 2),
    costCoins: round(model.costCoins, 1),
    efficiency: model.massG > 0 && !atSupport ? round(capacityKg / (model.massG / 1000), 0) : 0,
    floatingNodes: [],
    tooLongMembers: [],
  }
}

export function analyzeBridge(design: BridgeDesign): BridgeAnalysis {
  const model = buildBridgeModel(design)
  if (!model.ok) return model.analysis

  // Candidate load positions along the deck.
  const positions = design.loadMode === 'truck' ? truckPositions(model.deck) : [SPAN_CM / 2]
  let best: UnitResponse | null = null
  for (const x of positions) {
    const r = model.unitAt(x)
    if (!best || r.lambda < best.lambda) best = r
  }
  if (!best || !Number.isFinite(best.lambda)) {
    return { ...EMPTY, massG: model.massG, costCoins: model.costCoins, problem: 'mechanism', message: 'The load has nowhere to go. Check the road connects to the cliffs.' }
  }
  return analysisAt(model, best)
}

/** The analysis with the test load at one chosen spot along the deck (the Lab view's load position). */
export function analyzeBridgeAt(design: BridgeDesign, xLoadCm: number): BridgeAnalysis {
  const model = buildBridgeModel(design)
  if (!model.ok) return model.analysis
  return analysisAt(model, model.unitAt(xLoadCm))
}

// ---- Load response: what the Lab view's instruments read ----------------------------------

/** Everything the linear model says about a load at one position, packaged for live readouts. */
export interface LoadResponse {
  x: number
  ids: string[]
  lengthsCm: number[]
  /** Member force from self-weight (N, + tension) and per newton of test load (N/N). */
  selfN: number[]
  unitN: number[]
  tensionLimitN: number[]
  compressionLimitN: number[]
  eulerLimited: boolean[]
  /** Mid-span sag (mm, positive down) from self-weight, and per newton of test load. */
  sagSelfMm: number
  sagPerN: number
  /** Breaking test load (N; Infinity on a support), the first member to fail and how. */
  capacityN: number
  firstToBreak: string | null
  failureMode: FailureMode | null
}

export function responseAt(model: BridgeModel, r: UnitResponse): LoadResponse {
  const mid = SPAN_CM / 2
  const finite = Number.isFinite(r.lambda)
  return {
    x: r.x,
    ids: model.members.map((m) => m.id),
    lengthsCm: model.lengthsM.map((L) => Math.round(L * 1000) / 10),
    selfN: model.selfN,
    unitN: r.unitN,
    tensionLimitN: model.limits.map((l) => l.T),
    compressionLimitN: model.limits.map((l) => l.C),
    eulerLimited: model.limits.map((l) => l.euler),
    sagSelfMm: -deckDyAt(model, model.uSelf, mid) * 1000,
    sagPerN: -deckDyAt(model, r.uUnit, mid) * 1000,
    capacityN: r.lambda,
    firstToBreak: finite ? (model.members[r.idx]?.id ?? null) : null,
    failureMode: finite ? r.mode : null,
  }
}

/** Vertical displacement (m, + up) of the road at `xCm`, interpolated between road joints. */
function deckDyAt(model: BridgeModel, u: Float64Array, xCm: number): number {
  const dy = (n: BridgeNode) => {
    const i = model.index.get(n.id)
    return i === undefined ? 0 : u[2 * i + 1]
  }
  const deck = model.deck
  const exact = deck.find((n) => Math.abs(n.x - xCm) < 1e-6)
  if (exact) return dy(exact)
  for (let i = 0; i < deck.length - 1; i++) {
    const a = deck[i]
    const b = deck[i + 1]
    if (xCm > a.x && xCm < b.x) {
      const t = (xCm - a.x) / (b.x - a.x)
      return dy(a) + (dy(b) - dy(a)) * t
    }
  }
  return 0
}

/** Member forces and utilisation (|force| / limit; above 1 = broken) at a test load of `loadN` newtons. */
export function forcesAt(resp: LoadResponse, loadN: number) {
  const n = resp.ids.length
  const forceN = new Array<number>(n)
  const utilization = new Array<number>(n)
  let worst = 0
  let worstIdx = -1
  for (let i = 0; i < n; i++) {
    const f = resp.selfN[i] + loadN * resp.unitN[i]
    forceN[i] = f
    const lim = f >= 0 ? resp.tensionLimitN[i] : resp.compressionLimitN[i]
    const u = Math.abs(f) / Math.max(lim, 1e-9)
    utilization[i] = u
    if (u > worst) {
      worst = u
      worstIdx = i
    }
  }
  return { forceN, utilization, worst, worstIdx }
}

/** Mid-span sag (mm, positive down) at a test load of `loadN` newtons. */
export function sagAt(resp: LoadResponse, loadN: number) {
  return resp.sagSelfMm + loadN * resp.sagPerN
}

/** Where a truck's wheel might sit: every deck joint and the middle of every deck piece. */
function truckPositions(deck: BridgeNode[]): number[] {
  const xs: number[] = []
  for (let i = 0; i < deck.length; i++) {
    if (deck[i].x > 0 && deck[i].x < SPAN_CM) xs.push(deck[i].x)
    if (i < deck.length - 1) xs.push((deck[i].x + deck[i + 1].x) / 2)
  }
  return xs.length ? xs : [SPAN_CM / 2]
}

/** Lever rule: split a unit load at x between the deck joints either side of it. */
function distributeLoad(deck: BridgeNode[], x: number, add: (nodeId: string, share: number) => void) {
  const exact = deck.find((n) => Math.abs(n.x - x) < 1e-6)
  if (exact) {
    add(exact.id, 1)
    return
  }
  for (let i = 0; i < deck.length - 1; i++) {
    const a = deck[i]
    const b = deck[i + 1]
    if (x > a.x && x < b.x) {
      const t = (x - a.x) / (b.x - a.x)
      add(a.id, 1 - t)
      add(b.id, t)
      return
    }
  }
}

// ---- Tiny dense linear algebra (n ≤ ~100) --------------------------------

interface LU {
  a: Float64Array
  piv: Int32Array
}

function luDecompose(A: Float64Array, n: number): LU | null {
  const a = Float64Array.from(A)
  const piv = new Int32Array(n)
  for (let i = 0; i < n; i++) piv[i] = i
  let scale = 0
  for (let i = 0; i < n * n; i++) scale = Math.max(scale, Math.abs(a[i]))
  const eps = scale * 1e-10
  for (let k = 0; k < n; k++) {
    let p = k
    let max = Math.abs(a[k * n + k])
    for (let i = k + 1; i < n; i++) {
      const v = Math.abs(a[i * n + k])
      if (v > max) {
        max = v
        p = i
      }
    }
    if (max <= eps) return null
    if (p !== k) {
      for (let j = 0; j < n; j++) {
        const tmp = a[k * n + j]
        a[k * n + j] = a[p * n + j]
        a[p * n + j] = tmp
      }
      const tp = piv[k]
      piv[k] = piv[p]
      piv[p] = tp
    }
    const pivot = a[k * n + k]
    for (let i = k + 1; i < n; i++) {
      const f = a[i * n + k] / pivot
      a[i * n + k] = f
      if (f !== 0) for (let j = k + 1; j < n; j++) a[i * n + j] -= f * a[k * n + j]
    }
  }
  return { a, piv }
}

function luSolve({ a, piv }: LU, n: number, b: Float64Array): Float64Array {
  const y = new Float64Array(n)
  for (let i = 0; i < n; i++) {
    let s = b[piv[i]]
    for (let j = 0; j < i; j++) s -= a[i * n + j] * y[j]
    y[i] = s
  }
  const x = new Float64Array(n)
  for (let i = n - 1; i >= 0; i--) {
    let s = y[i]
    for (let j = i + 1; j < n; j++) s -= a[i * n + j] * x[j]
    x[i] = s / a[i * n + i]
  }
  return x
}

function round(v: number, d: number) {
  const p = 10 ** d
  return Math.round(v * p) / p
}

// ---- Templates --------------------------------------------------------------

export interface BridgeTemplate {
  id: string
  name: string
  emoji: string
  blurb: string
  build: (material: MaterialId) => Pick<BridgeDesign, 'nodes' | 'members'>
}

let seq = 0
export function newNodeId() {
  return `n${Date.now().toString(36)}${(seq++).toString(36)}`
}
export function newMemberId() {
  return `m${Date.now().toString(36)}${(seq++).toString(36)}`
}

function build(points: Record<string, [number, number]>, links: [string, string][], material: MaterialId): Pick<BridgeDesign, 'nodes' | 'members'> {
  const nodes: BridgeNode[] = supportNodes()
  for (const [id, [x, y]] of Object.entries(points)) nodes.push({ id, x, y })
  const members: BridgeMember[] = links.map(([a, b], i) => ({ id: `t${i}`, a, b, material }))
  return { nodes, members }
}

export const TEMPLATES: BridgeTemplate[] = [
  {
    id: 'beam',
    name: 'Flat beam',
    emoji: '➖',
    blurb: 'Just a road with no shape. Watch what happens!',
    build: (mat) => build({ d1: [10, 0], d2: [20, 0], d3: [30, 0] }, [['L', 'd1'], ['d1', 'd2'], ['d2', 'd3'], ['d3', 'R']], mat),
  },
  {
    id: 'warren',
    name: 'Warren truss',
    emoji: '🔺',
    blurb: 'A row of triangles: the classic strong-for-its-weight shape.',
    build: (mat) =>
      build(
        { d1: [10, 0], d2: [20, 0], d3: [30, 0], t1: [5, 10], t2: [15, 10], t3: [25, 10], t4: [35, 10] },
        [
          ['L', 'd1'], ['d1', 'd2'], ['d2', 'd3'], ['d3', 'R'],
          ['t1', 't2'], ['t2', 't3'], ['t3', 't4'],
          ['L', 't1'], ['t1', 'd1'], ['d1', 't2'], ['t2', 'd2'], ['d2', 't3'], ['t3', 'd3'], ['d3', 't4'], ['t4', 'R'],
        ],
        mat,
      ),
  },
  {
    id: 'pratt',
    name: 'Pratt truss',
    emoji: '🏗️',
    blurb: 'Verticals plus diagonals that lean to the middle. Diagonals pull, verticals push.',
    build: (mat) =>
      build(
        { d1: [10, 0], d2: [20, 0], d3: [30, 0], t1: [10, 10], t2: [20, 10], t3: [30, 10] },
        [
          ['L', 'd1'], ['d1', 'd2'], ['d2', 'd3'], ['d3', 'R'],
          ['t1', 't2'], ['t2', 't3'],
          ['L', 't1'], ['t3', 'R'],
          ['d1', 't1'], ['d2', 't2'], ['d3', 't3'],
          ['t1', 'd2'], ['t3', 'd2'],
        ],
        mat,
      ),
  },
  {
    id: 'howe',
    name: 'Howe truss',
    emoji: '🪜',
    blurb: 'Like Pratt but the diagonals lean outwards, so they push instead of pull.',
    build: (mat) =>
      build(
        { d1: [10, 0], d2: [20, 0], d3: [30, 0], t1: [10, 10], t2: [20, 10], t3: [30, 10] },
        [
          ['L', 'd1'], ['d1', 'd2'], ['d2', 'd3'], ['d3', 'R'],
          ['t1', 't2'], ['t2', 't3'],
          ['L', 't1'], ['t3', 'R'],
          ['d1', 't1'], ['d2', 't2'], ['d3', 't3'],
          ['d1', 't2'], ['d3', 't2'],
        ],
        mat,
      ),
  },
  {
    id: 'kingpost',
    name: 'King post',
    emoji: '⛺',
    blurb: 'The simplest truss: one triangle and a post. Great for short gaps.',
    build: (mat) => build({ d1: [20, 0], t1: [20, 15] }, [['L', 'd1'], ['d1', 'R'], ['L', 't1'], ['t1', 'R'], ['d1', 't1']], mat),
  },
  {
    id: 'underslung',
    name: 'Under-deck truss',
    emoji: '🌉',
    blurb: 'Triangles hanging below the road. Same idea, upside down.',
    build: (mat) =>
      build(
        { d1: [10, 0], d2: [20, 0], d3: [30, 0], b1: [5, -10], b2: [15, -10], b3: [25, -10], b4: [35, -10] },
        [
          ['L', 'd1'], ['d1', 'd2'], ['d2', 'd3'], ['d3', 'R'],
          ['b1', 'b2'], ['b2', 'b3'], ['b3', 'b4'],
          ['L', 'b1'], ['b1', 'd1'], ['d1', 'b2'], ['b2', 'd2'], ['d2', 'b3'], ['b3', 'd3'], ['d3', 'b4'], ['b4', 'R'],
        ],
        mat,
      ),
  },
]

export function templateDesign(templateId: string, material: MaterialId, base: Partial<BridgeDesign> = {}): Pick<BridgeDesign, 'nodes' | 'members' | 'loadMode' | 'budget'> {
  const t = TEMPLATES.find((x) => x.id === templateId) ?? TEMPLATES[1]
  return { ...t.build(material), loadMode: base.loadMode ?? 'center', budget: base.budget ?? DEFAULT_BUDGET }
}

export function describeLoadMode(mode: LoadMode) {
  return mode === 'center' ? 'Bucket hanging from the middle' : 'Toy truck driving across'
}
