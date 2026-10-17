import { useEffect, useState } from 'react'
import type { MeResponse } from '../../shared/types'
import { useAppAuth } from '../auth/AppAuth'
import { apiFetch } from './api'

// One fetch per page load, shared by every component that asks (header, admin page).
let cached: { userId: string; promise: Promise<MeResponse | null> } | null = null

/** The signed-in learner's server profile (`/api/me`), or null while loading, signed out or in guest mode. */
export function useMe(): MeResponse | null {
  const { enabled, isLoaded, isSignedIn, userId, getToken } = useAppAuth()
  const active = enabled && isLoaded && isSignedIn && Boolean(userId)
  const [loaded, setLoaded] = useState<{ userId: string; me: MeResponse | null } | null>(null)
  useEffect(() => {
    if (!active || !userId) return
    if (!cached || cached.userId !== userId) {
      cached = { userId, promise: apiFetch<MeResponse>('/api/me', getToken).catch(() => null) }
    }
    let alive = true
    void cached.promise.then((me) => {
      if (alive) setLoaded({ userId, me })
    })
    return () => {
      alive = false
    }
  }, [active, userId, getToken])
  return active && loaded?.userId === userId ? loaded.me : null
}
