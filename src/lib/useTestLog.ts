import { useCallback, useEffect, useState } from 'react'
import type { TestRecordBase } from '../../shared/types'
import { useAppAuth } from '../auth/AppAuth'
import { apiFetch } from './api'
import { LOCAL_KEYS, readLocal, writeLocal } from './local'
import { useEnrollmentStore } from '../store/enrollmentStore'

const MAX_LOCAL = 60

/** A workshop's saved tests (launches, load tests...). Account when signed in, browser otherwise. */
export function useTestLog<T extends TestRecordBase>(workshop: string) {
  const { isSignedIn, isLoaded, getToken } = useAppAuth()
  const [records, setRecords] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  const remote = isLoaded && isSignedIn
  const key = workshop === 'water-rocket' ? LOCAL_KEYS.launches : LOCAL_KEYS.tests(workshop)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      if (remote) {
        setRecords(await apiFetch<T[]>(`/api/launches?workshop=${encodeURIComponent(workshop)}`, getToken))
      } else {
        setRecords(readLocal<T[]>(key, []))
      }
    } catch {
      setRecords(readLocal<T[]>(key, []))
    } finally {
      setLoading(false)
    }
  }, [remote, getToken, key, workshop])

  useEffect(() => {
    if (isLoaded) void refresh()
  }, [isLoaded, refresh])

  const addRecord = useCallback(
    async (record: T) => {
      const withWorkshop = { ...record, workshop }
      void useEnrollmentStore.getState().join(workshop, { remote, getToken })
      if (remote) {
        const saved = await apiFetch<T>('/api/launches', getToken, { method: 'POST', body: withWorkshop })
        setRecords((l) => [saved, ...l])
        return saved
      }
      const all = [withWorkshop, ...readLocal<T[]>(key, [])].slice(0, MAX_LOCAL)
      writeLocal(key, all)
      setRecords(all)
      return withWorkshop
    },
    [remote, getToken, key, workshop],
  )

  const deleteRecord = useCallback(
    async (id: string) => {
      if (remote) {
        await apiFetch<void>(`/api/launches/${id}`, getToken, { method: 'DELETE' })
      } else {
        writeLocal(key, readLocal<T[]>(key, []).filter((l) => l.id !== id))
      }
      setRecords((l) => l.filter((x) => x.id !== id))
    },
    [remote, getToken, key],
  )

  const clearAll = useCallback(async () => {
    if (remote) {
      await apiFetch<void>(`/api/launches?workshop=${encodeURIComponent(workshop)}`, getToken, { method: 'DELETE' })
    } else {
      writeLocal(key, [])
    }
    setRecords([])
  }, [remote, getToken, key, workshop])

  return { records, loading, refresh, addRecord, deleteRecord, clearAll, remote }
}
