import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'

const InViewContext = createContext(true)

/** True while the nearest LazyMount box is on screen. 3-D scenes use it to pause their render loop. */
export function useInView() {
  return useContext(InViewContext)
}

/**
 * Mounts children the first time the box scrolls near the viewport and keeps them mounted afterwards,
 * telling them (via useInView) whether they are visible so they can pause when hidden.
 */
export function LazyMount({ children, className = '', rootMargin = '200px' }: { children: ReactNode; className?: string; rootMargin?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [inView, setInView] = useState(false)
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (!('IntersectionObserver' in window)) {
      setInView(true)
      setMounted(true)
      return
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          setInView(e.isIntersecting)
          if (e.isIntersecting) setMounted(true)
        }
      },
      { rootMargin },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [rootMargin])
  return (
    <div ref={ref} className={className}>
      {mounted ? (
        <InViewContext.Provider value={inView}>{children}</InViewContext.Provider>
      ) : (
        <div className="flex h-full w-full items-center justify-center text-ink-soft">Loading 3-D…</div>
      )}
    </div>
  )
}
