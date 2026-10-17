import { useFrame } from '@react-three/fiber'
import { useRef, type ReactNode, type RefObject } from 'react'
import { Object3D, Vector3 } from 'three'

/**
 * DOM labels that follow 3-D points, without drei's <Html> (which creates extra React roots and
 * fights React 19 StrictMode). Put <Anchor>s in the scene, <LabelProjector> inside the Canvas,
 * and render the label elements in a <LabelLayer> next to the Canvas.
 */
export type AnchorMap = Record<string, Object3D | null>
export type LabelElMap = Record<string, HTMLElement | null>

export function useLabelRefs() {
  const anchors = useRef<AnchorMap>({})
  const els = useRef<LabelElMap>({})
  return { anchors, els }
}

export function Anchor({ id, anchors, position }: { id: string; anchors: RefObject<AnchorMap>; position: [number, number, number] }) {
  return (
    <object3D
      position={position}
      ref={(o) => {
        anchors.current[id] = o
      }}
    />
  )
}

export function LabelProjector({ anchors, els }: { anchors: RefObject<AnchorMap>; els: RefObject<LabelElMap> }) {
  const v = useRef(new Vector3())
  useFrame(({ camera, size }) => {
    for (const id of Object.keys(els.current)) {
      const el = els.current[id]
      const a = anchors.current[id]
      if (!el || !a) continue
      a.getWorldPosition(v.current).project(camera)
      const x = ((v.current.x + 1) / 2) * size.width
      const y = ((1 - v.current.y) / 2) * size.height
      const onScreen = v.current.z < 1 && x > -80 && x < size.width + 80 && y > -40 && y < size.height + 40
      el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -50%)`
      el.style.opacity = onScreen ? '1' : '0'
    }
  })
  return null
}

export function LabelLayer({ children }: { children: ReactNode }) {
  return <div className="pointer-events-none absolute inset-0 overflow-hidden">{children}</div>
}

export const labelStyle: React.CSSProperties = { position: 'absolute', left: 0, top: 0, opacity: 0, willChange: 'transform' }
