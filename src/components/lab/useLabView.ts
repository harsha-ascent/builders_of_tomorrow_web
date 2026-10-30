import { useState } from 'react'
import { clearHash } from './useHashState'

export type LabView = 'lab' | 'simple'

/** The `view=` parameter of the URL hash, if it names a view. */
export function hashView(hash = typeof window === 'undefined' ? '' : window.location.hash): LabView | null {
  const raw = hash.startsWith('#') ? hash.slice(1) : hash
  if (!raw) return null
  const v = new URLSearchParams(raw).get('view')
  return v === 'lab' || v === 'simple' ? v : null
}

/**
 * Lab is the default; a link with `#view=simple` or `#view=lab` wins, then the choice remembered in
 * localStorage under `storageKey`. Choosing Simple clears the hash so the simple page has a plain URL.
 */
export function useLabView(storageKey: string): [LabView, (v: LabView) => void] {
  const [view, setView] = useState<LabView>(() => {
    if (typeof window === 'undefined') return 'lab'
    const fromHash = hashView()
    if (fromHash) return fromHash
    try {
      if (window.localStorage.getItem(storageKey) === 'simple') return 'simple'
    } catch {
      /* private mode */
    }
    return 'lab'
  })
  function choose(v: LabView) {
    setView(v)
    try {
      window.localStorage.setItem(storageKey, v)
    } catch {
      /* private mode */
    }
    if (v === 'simple') clearHash()
  }
  return [view, choose]
}
