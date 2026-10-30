import { useEffect, useState } from 'react'

/**
 * Mirrors a piece of state into the URL hash so a link reproduces it, and applies the hash on load, on
 * back/forward and when a new link is pasted. Uses replaceState, so dragging never fills the history.
 *
 * `encode` turns the current value into the hash body (without '#'); `apply` is given the whole hash
 * and should push any state it finds into the owning store. After a pasted hash is applied the hash is
 * rewritten in full, so a partial link ends up as a complete one.
 */
export function useHashState<T>(value: T, encode: (v: T) => string, apply: (hash: string) => void, enabled = true) {
  const [applied, setApplied] = useState(0)
  useEffect(() => {
    if (!enabled) return
    const run = () => {
      apply(window.location.hash)
      setApplied((n) => n + 1)
    }
    run()
    window.addEventListener('hashchange', run)
    return () => window.removeEventListener('hashchange', run)
  }, [apply, enabled])

  useEffect(() => {
    if (!enabled) return
    const next = `#${encode(value)}`
    if (window.location.hash === next) return
    window.history.replaceState(window.history.state, '', `${window.location.pathname}${window.location.search}${next}`)
  }, [value, encode, enabled, applied])
}

/** Removes the hash without reloading or adding a history entry. */
export function clearHash() {
  if (!window.location.hash) return
  window.history.replaceState(window.history.state, '', `${window.location.pathname}${window.location.search}`)
}
