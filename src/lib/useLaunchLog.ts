import { useCallback, useEffect, useState } from 'react'
import type { LaunchRecord } from '../../shared/types'
import { useAppAuth } from '../auth/AppAuth'
import { apiFetch } from './api'
import { LOCAL_KEYS, readLocal, writeLocal } from './local'

const MAX_LOCAL = 50

export function useLaunchLog() {
  const { isSignedIn, isLoaded, getToken } = useAppAuth()
  const [launches, setLaunches] = useState<LaunchRecord[]>([])
  const [loading, setLoading] = useState(true)
  const remote = isLoaded && isSignedIn

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      if (remote) {
        setLaunches(await apiFetch<LaunchRecord[]>('/api/launches', getToken))
      } else {
        setLaunches(readLocal<LaunchRecord[]>(LOCAL_KEYS.launches, []))
      }
    } catch {
      setLaunches(readLocal<LaunchRecord[]>(LOCAL_KEYS.launches, []))
    } finally {
      setLoading(false)
    }
  }, [remote, getToken])

  useEffect(() => {
    if (isLoaded) void refresh()
  }, [isLoaded, refresh])

  const addLaunch = useCallback(
    async (record: LaunchRecord) => {
      if (remote) {
        const saved = await apiFetch<LaunchRecord>('/api/launches', getToken, { method: 'POST', body: record })
        setLaunches((l) => [saved, ...l])
        return saved
      }
      const all = [record, ...readLocal<LaunchRecord[]>(LOCAL_KEYS.launches, [])].slice(0, MAX_LOCAL)
      writeLocal(LOCAL_KEYS.launches, all)
      setLaunches(all)
      return record
    },
    [remote, getToken],
  )

  const deleteLaunch = useCallback(
    async (id: string) => {
      if (remote) {
        await apiFetch<void>(`/api/launches/${id}`, getToken, { method: 'DELETE' })
      } else {
        writeLocal(
          LOCAL_KEYS.launches,
          readLocal<LaunchRecord[]>(LOCAL_KEYS.launches, []).filter((l) => l.id !== id),
        )
      }
      setLaunches((l) => l.filter((x) => x.id !== id))
    },
    [remote, getToken],
  )

  const clearAll = useCallback(async () => {
    if (remote) {
      await apiFetch<void>('/api/launches', getToken, { method: 'DELETE' })
    } else {
      writeLocal(LOCAL_KEYS.launches, [])
    }
    setLaunches([])
  }, [remote, getToken])

  return { launches, loading, refresh, addLaunch, deleteLaunch, clearAll, remote }
}
