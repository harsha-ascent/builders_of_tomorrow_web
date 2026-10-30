import { Line, OrbitControls, Text } from '@react-three/drei'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Suspense, useEffect, useMemo, useRef, type RefObject } from 'react'
import { Group, Mesh, Quaternion, Vector3 } from 'three'
import type { LaunchResult, RocketDesign, TrajectorySample } from '../../shared/types'
import { sampleAt, stageList } from '../sim/rocket'
import { Ground } from './Ground'
import { Launcher3D } from './Launcher3D'
import { LAUNCHER, restPose } from './launcherGeometry'
import { Rocket3D, StageBottle } from './Rocket3D'
import { WaterSpray, type SprayState } from './WaterSpray'

export type CameraMode = 'follow' | 'wide' | 'pad' | 'orbit'

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
  /**
   * Lab view: an external playback clock in seconds. The scene shows the rocket at this time (even when
   * paused, so a time cursor can scrub it) and never advances the clock itself.
   */
  timeRef?: RefObject<number>
  /** Lab view: draw the flight path and apogee marker in this colour, before and during playback. */
  accent?: string
  /** Lab view: dark "night range" look so the accent colour reads on an instrument panel. */
  night?: boolean
  /** Lab view with cameraMode 'orbit' or 'follow': bump to re-fit the camera to the whole flight. */
  fitKey?: number
}

export function LaunchScene(props: LaunchSceneProps) {
  const markersTo = props.result ? Math.ceil((props.result.rangeM + 20) / 10) * 10 : 60
  const orbit = props.cameraMode === 'orbit' || (props.cameraMode === 'follow' && props.timeRef !== undefined)
  return (
    <Canvas
      shadows
      dpr={[1, 1.5]}
      camera={{ fov: 45, near: 0.05, far: 3000, position: [1.9, 1.1, 2.6] }}
      gl={{ antialias: true }}
    >
      {props.night && (
        <>
          <color attach="background" args={['#0a0e16']} />
          <fog attach="fog" args={['#0a0e16', 80, 700]} />
        </>
      )}
      {/* Distance labels load a font asynchronously; suspend inside the canvas, not the page. */}
      <Suspense fallback={null}>
        <Ground
          markersTo={Math.max(markersTo, props.targetDistance ? props.targetDistance + 20 : 0)}
          targetDistance={props.targetDistance ?? null}
          night={props.night}
          clouds={!props.night}
        />
        <Flight {...props} orbit={orbit} />
      </Suspense>
    </Canvas>
  )
}

function Flight({ design, result, playing, speed, cameraMode, padPressureKPa, onTick, resetKey, timeRef, accent, night, fitKey, orbit }: LaunchSceneProps & { orbit: boolean }) {
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
  const plumb = useRef<Mesh>(null)
  const altLabel = useRef<Group>(null)
  const altText = useRef<{ text: string } | null>(null)
  const lastLabel = useRef(0)
  const stages = useMemo(() => stageList(design), [design])
  const nStages = stages.length
  const boosterGroups = useRef<(Group | null)[]>([])
  const chuteGroup = useRef<Group | null>(null)
  const fallGroups = useRef<(Group | null)[]>([])
  const falling = useRef<{ active: boolean; x: number; y: number; vx: number; vy: number; rot: number; spin: number }[]>([])
  const prevAttached = useRef(nStages)
  const external = timeRef !== undefined

  const rewind = () => {
    t.current = 0
    finished.current = false
    sprayState.current.phase = 'ready'
    prevAttached.current = nStages
    falling.current = []
    for (const g of boosterGroups.current) if (g) g.visible = true
    for (const g of fallGroups.current) if (g) g.visible = false
    if (chuteGroup.current) chuteGroup.current.visible = false
  }

  // Rewind whenever the flight changes or the parent asks for a reset.
  useEffect(rewind, [result, resetKey, nStages])

  useEffect(() => {
    if (!playing || !result) pressureRef.current = padPressureKPa
  }, [padPressureKPa, playing, result])

  const targetQ = useMemo(() => new Quaternion(), [])
  const zAxis = useMemo(() => new Vector3(0, 0, 1), [])
  const up = useMemo(() => new Vector3(0, 1, 0), [])
  const tmp = useMemo(() => new Vector3(), [])

  useFrame((state, dtRaw) => {
    const g = rocket.current
    if (!g) return
    const dt = Math.min(dtRaw, 0.05)

    const showFlight = result && (playing || (external && timeRef.current > 0))
    if (!showFlight) {
      if (plumb.current) plumb.current.visible = false
      if (altLabel.current) altLabel.current.visible = false
      g.position.set(pose.x, pose.y, 0)
      targetQ.setFromAxisAngle(zAxis, pose.rotZ)
      g.quaternion.copy(targetQ)
      sprayState.current.phase = 'ready'
      pressureRef.current = padPressureKPa
      waterRef.current = design.waterFraction
      if (external && t.current !== 0) rewind()
      return
    }

    if (external) {
      // Scrubbed backwards: put everything back together before replaying the separations.
      const target = timeRef.current
      if (target < t.current) rewind()
      t.current = target
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

    if (!external && !finished.current) t.current += dt * speed
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
    if (external && !playing) g.quaternion.copy(targetQ)
    else g.quaternion.slerp(targetQ, 1 - Math.exp(-(underChute ? 3 : 7) * dt))

    if (chuteGroup.current) {
      const c = chuteGroup.current
      c.visible = s.chute > 0.01
      const sc = Math.max(s.chute, 0.01)
      c.scale.set(sc, sc, sc)
    }

    // Vertical height indicator: a plumb line from the rocket to the ground plus a floating altitude label.
    const alt = Math.max(s.y, 0)
    if (plumb.current) {
      plumb.current.visible = alt > 0.6
      plumb.current.position.set(pose.x + s.x, alt / 2, 0)
      plumb.current.scale.set(1, Math.max(alt, 0.001), 1)
    }
    if (altLabel.current) {
      altLabel.current.visible = alt > 0.6
      const camDist = Math.max(1.5, state.camera.position.distanceTo(g.position))
      const k = camDist * 0.045
      altLabel.current.position.set(pose.x + s.x + camDist * 0.08, alt, 0)
      altLabel.current.scale.set(k, k, k)
      altLabel.current.quaternion.copy(state.camera.quaternion)
      if (altText.current && Math.abs(t.current - lastLabel.current) > 0.15) {
        lastLabel.current = t.current
        const txt = `${alt.toFixed(1)} m`
        if (altText.current.text !== txt) altText.current.text = txt
      }
    }

    // spray state
    const st = sprayState.current
    st.phase = done || (external && !playing) ? (done ? 'landed' : 'ready') : s.phase
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

  const apogee = useMemo(() => {
    if (!result || !result.liftedOff) return null
    const e = result.events.find((ev) => ev.type === 'apogee')
    const x = e ? e.x : result.samples.reduce((b, s) => (s.y > b.y ? s : b), result.samples[0]).x
    return { x: pose.x + x, y: result.maxHeightM + pose.y, label: `${result.maxHeightM.toFixed(1)} m` }
  }, [result, pose])

  const labelColor = night ? '#e6ebf5' : '#1e2a4a'
  const outline = night ? '#0a0e16' : '#ffffff'

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
      {path && accent && result && (
        <PreviewPath points={path} apogee={apogee} color={accent} span={Math.max(result.rangeM, result.maxHeightM, 6)} outline={outline} />
      )}
      {path && !accent && playing && (
        <>
          {/* light halo under a dark dashed line so the path reads on sky and grass alike */}
          <Line points={path} color="#ffffff" lineWidth={6} transparent opacity={0.45} />
          <Line points={path} color="#1e2a4a" lineWidth={3} dashed dashSize={0.9} gapSize={0.35} />
        </>
      )}
      <mesh ref={plumb} visible={false}>
        <cylinderGeometry args={[0.012, 0.012, 1, 8]} />
        <meshBasicMaterial color={accent ?? '#1e2a4a'} transparent opacity={0.55} />
      </mesh>
      <group ref={altLabel} visible={false}>
        <Text ref={altText as never} fontSize={1} color={accent ?? labelColor} anchorX="left" anchorY="middle" outlineWidth={0.08} outlineColor={outline}>
          0.0 m
        </Text>
      </group>
      <HeightPole topM={result ? result.maxHeightM : 30} color={labelColor} outline={outline} />
      {orbit ? (
        <OrbitRig rocket={rocket} result={result} playing={playing} follow={cameraMode === 'follow'} fitKey={fitKey ?? 0} />
      ) : (
        <CameraRig mode={cameraMode} rocket={rocket} result={result} playing={playing} />
      )}
    </>
  )
}

/** The predicted (or played) flight path with its apogee marked, drawn in the lab's accent colour. */
function PreviewPath({
  points,
  apogee,
  color,
  span,
  outline,
}: {
  points: [number, number, number][]
  apogee: { x: number; y: number; label: string } | null
  color: string
  span: number
  outline: string
}) {
  const r = Math.max(0.1, span * 0.012)
  const fontSize = Math.max(0.5, span * 0.045)
  return (
    <>
      <Line points={points} color={color} lineWidth={2.5} transparent opacity={0.95} />
      {apogee && (
        <group position={[apogee.x, apogee.y, 0]}>
          <mesh>
            <sphereGeometry args={[r, 16, 16]} />
            <meshBasicMaterial color={color} />
          </mesh>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[r * 2.6, r * 0.25, 8, 32]} />
            <meshBasicMaterial color={color} transparent opacity={0.8} />
          </mesh>
          <Text position={[r * 4, r * 2, 0]} fontSize={fontSize} color={color} anchorX="left" anchorY="bottom" outlineWidth={fontSize * 0.08} outlineColor={outline}>
            {`apogee ${apogee.label}`}
          </Text>
        </group>
      )}
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

interface OrbitLike {
  target: Vector3
  update: () => void
}

/**
 * Lab camera: free orbit (drag to spin, scroll or pinch to zoom, right-drag to pan). Until the user takes
 * over it glides to frame the whole predicted flight; `fitKey` brings it back; `follow` tracks the rocket.
 */
function OrbitRig({
  rocket,
  result,
  playing,
  follow,
  fitKey,
}: {
  rocket: RefObject<Group | null>
  result: LaunchResult | null
  playing: boolean
  follow: boolean
  fitKey: number
}) {
  const controls = useRef<OrbitLike | null>(null)
  const { camera } = useThree()
  const userMoved = useRef(false)
  const fit = useMemo(() => {
    const span = result && result.liftedOff ? Math.max(result.rangeM, result.maxHeightM, 6) : 6
    const cx = result && result.liftedOff ? result.rangeM / 2 : 0.3
    const cy = result && result.liftedOff ? result.maxHeightM * 0.55 : 0.6
    return { target: new Vector3(cx, cy, 0), pos: new Vector3(cx - span * 0.2, cy + span * 0.22, span * 1.55) }
  }, [result])
  useEffect(() => {
    userMoved.current = false
  }, [fitKey])

  useFrame((_, dtRaw) => {
    const c = controls.current
    if (!c) return
    const dt = Math.min(dtRaw, 0.05)
    const k = 1 - Math.exp(-3 * dt)
    if (follow && playing && rocket.current) {
      c.target.lerp(rocket.current.position, k)
    } else if (!userMoved.current) {
      c.target.lerp(fit.target, k)
      camera.position.lerp(fit.pos, k)
    }
    c.update()
  })

  return (
    <OrbitControls
      ref={controls as never}
      makeDefault
      enablePan
      minDistance={0.6}
      maxDistance={800}
      maxPolarAngle={Math.PI / 2 - 0.02}
      onStart={() => {
        userMoved.current = true
      }}
    />
  )
}

/** A vertical ruler beside the pad with a tick and label every 10 m, so height can be read off the picture. */
function HeightPole({ topM, color = '#1e2a4a', outline = '#ffffff' }: { topM: number; color?: string; outline?: string }) {
  const top = Math.max(10, Math.ceil((topM + 5) / 10) * 10)
  const ticks = useMemo(() => {
    const out: number[] = []
    for (let h = 10; h <= top; h += 10) out.push(h)
    return out
  }, [top])
  const x = -1.6
  const fontSize = Math.max(0.6, top / 45)
  return (
    <group position={[x, 0, 0]}>
      <mesh position={[0, top / 2, 0]}>
        <cylinderGeometry args={[0.03, 0.03, top, 8]} />
        <meshStandardMaterial color={color} transparent opacity={0.5} />
      </mesh>
      {ticks.map((h) => (
        <group key={h} position={[0, h, 0]}>
          <mesh position={[-0.35, 0, 0]}>
            <boxGeometry args={[0.7, 0.05, 0.05]} />
            <meshStandardMaterial color={h % 50 === 0 ? '#ff6b6b' : color} />
          </mesh>
          <Text position={[-0.8, 0, 0]} fontSize={fontSize} color={color} anchorX="right" anchorY="middle" outlineWidth={fontSize * 0.08} outlineColor={outline}>
            {`${h} m`}
          </Text>
        </group>
      ))}
    </group>
  )
}
