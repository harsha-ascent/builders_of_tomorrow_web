import { Line } from '@react-three/drei'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Suspense, useEffect, useMemo, useRef, type RefObject } from 'react'
import { Group, Quaternion, Vector3 } from 'three'
import type { LaunchResult, RocketDesign, TrajectorySample } from '../../shared/types'
import { sampleAt, stageList } from '../sim/rocket'
import { Ground } from './Ground'
import { Launcher3D } from './Launcher3D'
import { LAUNCHER, restPose } from './launcherGeometry'
import { Rocket3D, StageBottle } from './Rocket3D'
import { WaterSpray, type SprayState } from './WaterSpray'

export type CameraMode = 'follow' | 'wide' | 'pad'

export interface LaunchSceneProps {
  design: RocketDesign
  /** The flight to play. null = rocket waiting on the pad. */
  result: LaunchResult | null
  playing: boolean
  /** 1 = real time, 0.25 = slow motion. */
  speed: number
  cameraMode: CameraMode
  targetDistance?: number | null
  /** Pressure to show on the gauge while waiting (kPa). */
  padPressureKPa: number
  /** Called ~30 times a second with the current sample; `done` once the rocket has landed. */
  onTick?: (sample: TrajectorySample, done: boolean) => void
  /** Change this value to rewind the flight to t = 0. */
  resetKey: number
}

export function LaunchScene(props: LaunchSceneProps) {
  const markersTo = props.result ? Math.ceil((props.result.rangeM + 20) / 10) * 10 : 60
  return (
    <Canvas
      shadows
      dpr={[1, 1.5]}
      camera={{ fov: 45, near: 0.05, far: 3000, position: [1.9, 1.1, 2.6] }}
      gl={{ antialias: true }}
    >
      {/* Distance labels load a font asynchronously; suspend inside the canvas, not the page. */}
      <Suspense fallback={null}>
        <Ground markersTo={Math.max(markersTo, props.targetDistance ? props.targetDistance + 20 : 0)} targetDistance={props.targetDistance ?? null} />
        <Flight {...props} />
      </Suspense>
    </Canvas>
  )
}

function Flight({ design, result, playing, speed, cameraMode, padPressureKPa, onTick, resetKey }: LaunchSceneProps) {
  const rocket = useRef<Group>(null)
  const t = useRef(0)
  const finished = useRef(false)
  const frame = useRef(0)
  const pressureRef = useRef(padPressureKPa)
  const waterRef = useRef(design.waterFraction)
  const sprayState = useRef<SprayState>({
    phase: 'ready',
    nozzle: new Vector3(),
    outDir: new Vector3(0, -1, 0),
    rocketVel: new Vector3(),
  })
  const pose = useMemo(() => restPose(design.launchAngleDeg), [design.launchAngleDeg])
  const guideLen = LAUNCHER.tubeLength - LAUNCHER.rocketOffset
  const stages = useMemo(() => stageList(design), [design])
  const nStages = stages.length
  const boosterGroups = useRef<(Group | null)[]>([])
  const chuteGroup = useRef<Group | null>(null)
  const fallGroups = useRef<(Group | null)[]>([])
  const falling = useRef<{ active: boolean; x: number; y: number; vx: number; vy: number; rot: number; spin: number }[]>([])
  const prevAttached = useRef(nStages)

  // Rewind whenever the flight changes or the parent asks for a reset.
  useEffect(() => {
    t.current = 0
    finished.current = false
    sprayState.current.phase = 'ready'
    prevAttached.current = nStages
    falling.current = []
    for (const g of boosterGroups.current) if (g) g.visible = true
    for (const g of fallGroups.current) if (g) g.visible = false
    if (chuteGroup.current) chuteGroup.current.visible = false
  }, [result, resetKey, nStages])

  useEffect(() => {
    if (!playing || !result) pressureRef.current = padPressureKPa
  }, [padPressureKPa, playing, result])

  const targetQ = useMemo(() => new Quaternion(), [])
  const zAxis = useMemo(() => new Vector3(0, 0, 1), [])
  const up = useMemo(() => new Vector3(0, 1, 0), [])
  const tmp = useMemo(() => new Vector3(), [])

  useFrame((_, dtRaw) => {
    const g = rocket.current
    if (!g) return
    const dt = Math.min(dtRaw, 0.05)

    if (!result || !playing) {
      g.position.set(pose.x, pose.y, 0)
      targetQ.setFromAxisAngle(zAxis, pose.rotZ)
      g.quaternion.copy(targetQ)
      sprayState.current.phase = 'ready'
      pressureRef.current = padPressureKPa
      waterRef.current = design.waterFraction
      return
    }

    // Boosters: hide the ones that have separated and start them tumbling down.
    const sNow = sampleAt(result.samples, t.current)
    if (sNow.attached < prevAttached.current) {
      for (let i = nStages - prevAttached.current; i < nStages - sNow.attached; i++) {
        const bg = boosterGroups.current[i]
        if (bg) bg.visible = false
        const dirX = Math.cos(g.rotation.z + Math.PI / 2)
        const dirY = Math.sin(g.rotation.z + Math.PI / 2)
        falling.current[i] = {
          active: true,
          x: g.position.x - dirX * 0.1,
          y: g.position.y - dirY * 0.1,
          vx: sNow.vx * 0.85 - dirX * 1.5,
          vy: sNow.vy * 0.85 - dirY * 1.5,
          rot: g.rotation.z,
          spin: (i % 2 === 0 ? 1 : -1) * 4,
        }
      }
      prevAttached.current = sNow.attached
    }
    for (let i = 0; i < falling.current.length; i++) {
      const f = falling.current[i]
      const fg = fallGroups.current[i]
      if (!f || !f.active || !fg) continue
      const step = dt * speed
      const v = Math.hypot(f.vx, f.vy)
      const k = 0.08 // a tumbling empty bottle has lots of drag per kilogram
      f.vx -= k * v * f.vx * step
      f.vy -= k * v * f.vy * step + 9.81 * step
      f.x += f.vx * step
      f.y += f.vy * step
      f.rot += f.spin * step
      if (f.y <= 0.05) {
        f.y = 0.05
        f.active = false
        f.rot = -Math.PI / 2 + 0.2
      }
      fg.visible = true
      fg.position.set(f.x, f.y, 0)
      fg.rotation.z = f.rot
    }

    if (!finished.current) t.current += dt * speed
    const s = sampleAt(result.samples, t.current)
    const last = result.samples[result.samples.length - 1]
    const done = t.current >= last.t

    g.position.set(pose.x + s.x, s.y, 0)
    const travelled = Math.hypot(s.x, s.y - pose.y)
    const spd = Math.hypot(s.vx, s.vy)
    let angle: number
    const underChute = s.phase === 'parachute' || (done && s.chute > 0)
    if (underChute) {
      angle = 0 // hanging nose-up under the canopy
    } else if (done) {
      angle = -Math.PI / 2 + 0.25
    } else if (travelled < guideLen || spd < 0.3) {
      angle = pose.rotZ
    } else {
      angle = Math.atan2(s.vy, s.vx) - Math.PI / 2
    }
    targetQ.setFromAxisAngle(zAxis, angle)
    g.quaternion.slerp(targetQ, 1 - Math.exp(-(underChute ? 3 : 7) * dt))

    if (chuteGroup.current) {
      const c = chuteGroup.current
      c.visible = s.chute > 0.01
      const sc = Math.max(s.chute, 0.01)
      c.scale.set(sc, sc, sc)
    }

    // spray state
    const st = sprayState.current
    st.phase = done ? 'landed' : s.phase
    st.nozzle.copy(g.position)
    tmp.copy(up).applyQuaternion(g.quaternion).multiplyScalar(-1)
    st.outDir.copy(tmp)
    st.rocketVel.set(s.vx, s.vy, 0)
    pressureRef.current = s.pressureKPa
    waterRef.current = s.water

    frame.current++
    if (onTick && (frame.current % 2 === 0 || done)) onTick(s, done)
    if (done) finished.current = true
  })

  const path = useMemo(() => {
    if (!result) return null
    const step = Math.max(1, Math.floor(result.samples.length / 250))
    const pts: [number, number, number][] = []
    for (let i = 0; i < result.samples.length; i += step) {
      const s = result.samples[i]
      pts.push([pose.x + s.x, Math.max(s.y, 0.02), 0])
    }
    const l = result.samples[result.samples.length - 1]
    pts.push([pose.x + l.x, 0.02, 0])
    return pts
  }, [result, pose])

  return (
    <>
      <Launcher3D angleDeg={design.launchAngleDeg} pressureRef={pressureRef} />
      <group ref={rocket} position={[pose.x, pose.y, 0]}>
        <Rocket3D
          design={design}
          water={design.waterFraction}
          waterRef={waterRef}
          onBoosterGroup={(i, grp) => {
            boosterGroups.current[i] = grp
          }}
          onChuteGroup={(grp) => {
            chuteGroup.current = grp
          }}
        />
      </group>
      {/* Separated boosters tumbling back to the ground */}
      {stages.slice(0, -1).map((st, i) => (
        <group
          key={i}
          visible={false}
          ref={(grp) => {
            fallGroups.current[i] = grp
          }}
        >
          <StageBottle stage={st} water={0} bodyColor={design.bodyColor} finColor={design.finColor} finCount={3} finScale={1.15} coupler />
        </group>
      ))}
      <WaterSpray stateRef={sprayState} />
      {path && playing && (
        <Line points={path} color="#ffffff" lineWidth={2} dashed dashSize={0.6} gapSize={0.4} transparent opacity={0.75} />
      )}
      <CameraRig mode={cameraMode} rocket={rocket} result={result} playing={playing} />
    </>
  )
}

function CameraRig({
  mode,
  rocket,
  result,
  playing,
}: {
  mode: CameraMode
  rocket: RefObject<Group | null>
  result: LaunchResult | null
  playing: boolean
}) {
  const { camera } = useThree()
  const look = useRef(new Vector3(0.3, 0.6, 0))
  const targetPos = useMemo(() => new Vector3(), [])
  const targetLook = useMemo(() => new Vector3(), [])

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05)
    const p = rocket.current?.position ?? new Vector3()
    const flying = Boolean(result && playing)

    if (!flying || mode === 'pad') {
      targetPos.set(1.9, 1.1, 2.6)
      targetLook.set(0.2, 0.5, 0)
    } else if (mode === 'follow') {
      const dist = 2.3 + Math.min(p.y, 80) * 0.03
      targetPos.set(p.x - dist * 0.55, p.y + dist * 0.3, dist)
      targetLook.copy(p)
    } else {
      const span = Math.max(result!.rangeM, result!.maxHeightM, 12)
      targetPos.set(result!.rangeM / 2 - span * 0.05, span * 0.5, span * 1.25)
      targetLook.set(result!.rangeM / 2, span * 0.38, 0)
    }
    const k = 1 - Math.exp(-3.5 * dt)
    camera.position.lerp(targetPos, k)
    look.current.lerp(targetLook, k)
    camera.lookAt(look.current)
  })
  return null
}
