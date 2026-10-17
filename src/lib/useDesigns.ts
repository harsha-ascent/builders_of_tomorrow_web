import { useCallback, useEffect, useMemo, useState } from 'react'
import type { RocketDesign } from '../../shared/types'
import { useAppAuth } from '../auth/AppAuth'
import { apiFetch } from './api'
import { LOCAL_KEYS, readLocal, writeLocal } from './local'

export function useDesigns(workshop?: string) {
  const { isSignedIn, isLoaded, getToken } = useAppAuth()
  const [designs, setDesigns] = useState<RocketDesign[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const remote = isLoaded && isSignedIn

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      if (remote) {
        const q = workshop ? `?workshop=${encodeURIComponent(workshop)}` : ''
        const list = await apiFetch<RocketDesign[]>(`/api/designs${q}`, getToken)
        setDesigns(list)
      } else {
        const list = readLocal<RocketDesign[]>(LOCAL_KEYS.designs, [])
        setDesigns(workshop ? list.filter((d) => d.workshop === workshop) : list)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load rockets')
    } finally {
      setLoading(false)
    }
  }, [remote, workshop, getToken])

  useEffect(() => {
    if (isLoaded) void refresh()
  }, [isLoaded, refresh])

  const saveDesign = useCallback(
    async (design: RocketDesign) => {
      const now = new Date().toISOString()
      const next: RocketDesign = { ...design, updatedAt: now, createdAt: design.createdAt ?? now }
      if (remote) {
        const saved = await apiFetch<RocketDesign>(`/api/designs/${next.id}`, getToken, { method: 'PUT', body: next })
        setDesigns((list) => upsert(list, saved))
        return saved
      }
      const all = upsert(readLocal<RocketDesign[]>(LOCAL_KEYS.designs, []), next)
      writeLocal(LOCAL_KEYS.designs, all)
      setDesigns(workshop ? all.filter((d) => d.workshop === workshop) : all)
      return next
    },
    [remote, getToken, workshop],
  )

  const deleteDesign = useCallback(
    async (id: string) => {
      if (remote) {
        await apiFetch<void>(`/api/designs/${id}`, getToken, { method: 'DELETE' })
        setDesigns((list) => list.filter((d) => d.id !== id))
        return
      }
      const all = readLocal<RocketDesign[]>(LOCAL_KEYS.designs, []).filter((d) => d.id !== id)
      writeLocal(LOCAL_KEYS.designs, all)
      setDesigns(workshop ? all.filter((d) => d.workshop === workshop) : all)
    },
    [remote, getToken, workshop],
  )

  /** Copies rockets saved on this device into the signed-in account. */
  const uploadLocalDesigns = useCallback(async () => {
    if (!remote) return 0
    const local = readLocal<RocketDesign[]>(LOCAL_KEYS.designs, [])
    for (const d of local) {
      await apiFetch<RocketDesign>(`/api/designs/${d.id}`, getToken, { method: 'PUT', body: d })
    }
    writeLocal(LOCAL_KEYS.designs, [])
    await refresh()
    return local.length
  }, [remote, getToken, refresh])

  const localCount = useMemo(() => readLocal<RocketDesign[]>(LOCAL_KEYS.designs, []).length, [designs])

  return { designs, loading, error, refresh, saveDesign, deleteDesign, uploadLocalDesigns, localCount, remote }
}

function upsert(list: RocketDesign[], item: RocketDesign) {
  const i = list.findIndex((d) => d.id === item.id)
  if (i === -1) return [item, ...list]
  const copy = list.slice()
  copy[i] = item
  return copy
}
