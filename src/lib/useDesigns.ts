import { useCallback, useEffect, useMemo, useState } from 'react'
import type { DesignBase } from '../../shared/types'
import { useAppAuth } from '../auth/AppAuth'
import { apiFetch } from './api'
import { LOCAL_KEYS, readLocal, writeLocal } from './local'
import { useEnrollmentStore } from '../store/enrollmentStore'

export type Normalizer<T extends DesignBase> = (d: Partial<T> & { id: string }) => T

/**
 * Saved designs for one workshop: in the account when signed in, otherwise in this browser.
 * `normalize` upgrades older saves to the current shape.
 */
export function useDesigns<T extends DesignBase>(workshop: string, normalize: Normalizer<T>) {
  const { isSignedIn, isLoaded, getToken } = useAppAuth()
  const [designs, setDesigns] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const remote = isLoaded && isSignedIn

  const readAllLocal = useCallback(() => readLocal<DesignBase[]>(LOCAL_KEYS.designs, []), [])
  const forWorkshop = useCallback(
    (list: DesignBase[]) => list.filter((d) => d.workshop === workshop).map((d) => normalize(d as Partial<T> & { id: string })),
    [workshop, normalize],
  )

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      if (remote) {
        const list = await apiFetch<DesignBase[]>(`/api/designs?workshop=${encodeURIComponent(workshop)}`, getToken)
        setDesigns(forWorkshop(list))
      } else {
        setDesigns(forWorkshop(readAllLocal()))
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load your designs')
    } finally {
      setLoading(false)
    }
  }, [remote, workshop, getToken, forWorkshop, readAllLocal])

  useEffect(() => {
    if (isLoaded) void refresh()
  }, [isLoaded, refresh])

  const saveDesign = useCallback(
    async (design: T) => {
      const now = new Date().toISOString()
      const next: T = { ...design, workshop, updatedAt: now, createdAt: design.createdAt ?? now }
      void useEnrollmentStore.getState().join(workshop, { remote, getToken })
      if (remote) {
        const saved = normalize((await apiFetch<DesignBase>(`/api/designs/${next.id}`, getToken, { method: 'PUT', body: next })) as Partial<T> & { id: string })
        setDesigns((list) => upsert(list, saved))
        return saved
      }
      const all = upsert(readAllLocal(), next)
      writeLocal(LOCAL_KEYS.designs, all)
      setDesigns(forWorkshop(all))
      return next
    },
    [remote, getToken, workshop, normalize, forWorkshop, readAllLocal],
  )

  const deleteDesign = useCallback(
    async (id: string) => {
      if (remote) {
        await apiFetch<void>(`/api/designs/${id}`, getToken, { method: 'DELETE' })
        setDesigns((list) => list.filter((d) => d.id !== id))
        return
      }
      const all = readAllLocal().filter((d) => d.id !== id)
      writeLocal(LOCAL_KEYS.designs, all)
      setDesigns(forWorkshop(all))
    },
    [remote, getToken, forWorkshop, readAllLocal],
  )

  /** Copies designs saved on this device (all workshops) into the signed-in account. */
  const uploadLocalDesigns = useCallback(async () => {
    if (!remote) return 0
    const local = readAllLocal()
    for (const d of local) {
      await apiFetch<DesignBase>(`/api/designs/${d.id}`, getToken, { method: 'PUT', body: d })
    }
    writeLocal(LOCAL_KEYS.designs, [])
    await refresh()
    return local.length
  }, [remote, getToken, refresh, readAllLocal])

  const localCount = useMemo(() => readAllLocal().filter((d) => d.workshop === workshop).length, [designs, readAllLocal, workshop])

  return { designs, loading, error, refresh, saveDesign, deleteDesign, uploadLocalDesigns, localCount, remote }
}

function upsert<T extends DesignBase>(list: T[], item: T): T[] {
  const i = list.findIndex((d) => d.id === item.id)
  if (i === -1) return [item, ...list]
  const copy = list.slice()
  copy[i] = item
  return copy
}
