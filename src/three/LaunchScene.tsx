import { Line } from '@react-three/drei'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef, type RefObject } from 'react'
import { Group, Quaternion, Vector3 } from 'three'
import type { LaunchResult, RocketDesign, TrajectorySample } from '../../shared/types'
import { sampleAt } from '../sim/rocket'
import { Ground } from './Ground'
import { Launcher3D } from './Launcher3D'
import { LAUNCHER, restPose } from './launcherGeometry'
import { Rocket3D } from './Rocket3D'
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
      <Ground markersTo={Math.max(markersTo, props.targetDistance ? props.targetDistance + 20 : 0)} targetDistance={props.targetDistance ?? null} />
      <Flight {...props} />
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

  // Rewind whenever the flight changes or the parent asks for a reset.
  useEffect(() => {
    t.current = 0
    finished.current = false
    sprayState.current.phase = 'ready'
  }, [result, resetKey])

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

    if (!finished.current) t.current += dt * speed
    const s = sampleAt(result.samples, t.current)
    const last = result.samples[result.samples.length - 1]
    const done = t.current >= last.t

    g.position.set(pose.x + s.x, s.y, 0)
    const travelled = Math.hypot(s.x, s.y - pose.y)
    const spd = Math.hypot(s.vx, s.vy)
    let angle: number
    if (done) {
      angle = -Math.PI / 2 + 0.25
    } else if (travelled < guideLen || spd < 0.3) {
      angle = pose.rotZ
    } else {
      angle = Math.atan2(s.vy, s.vx) - Math.PI / 2
    }
    targetQ.setFromAxisAngle(zAxis, angle)
    g.quaternion.slerp(targetQ, 1 - Math.exp(-7 * dt))

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
        <Rocket3D design={design} water={design.waterFraction} waterRef={waterRef} />
      </group>
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
