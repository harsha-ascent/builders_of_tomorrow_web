import { useCallback, useEffect, useRef, useState } from 'react'
import type { WorksheetAnswer, WorksheetAnswers, WorksheetProgress } from '../../shared/types'
import { useAppAuth } from '../auth/AppAuth'
import { apiFetch } from './api'
import { LOCAL_KEYS, readLocal, writeLocal } from './local'

type Index = Record<string, { updatedAt: string; answered: number }>

function readIndex(): Index {
  return readLocal<Index>(LOCAL_KEYS.worksheetIndex, {})
}

export function countAnswered(answers: WorksheetAnswers) {
  return Object.values(answers).filter((v) => {
    if (Array.isArray(v)) return v.some((x) => (Array.isArray(x) ? x.some(Boolean) : Boolean(x)))
    return v !== '' && v !== null && v !== undefined && v !== false
  }).length
}

/** Answers for one worksheet, auto-saved (debounced) locally or to the account. */
export function useWorksheet(workshop: string, worksheetId: string) {
  const { isSignedIn, isLoaded, getToken } = useAppAuth()
  const remote = isLoaded && isSignedIn
  const key = LOCAL_KEYS.worksheet(workshop, worksheetId)
  const [answers, setAnswers] = useState<WorksheetAnswers>(() => readLocal<WorksheetAnswers>(key, {}))
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const timer = useRef<number | null>(null)
  const dirty = useRef(false)

  // Load from the account when signed in.
  useEffect(() => {
    if (!remote) return
    let cancelled = false
    apiFetch<WorksheetProgress | null>(`/api/worksheets/${workshop}/${worksheetId}`, getToken)
      .then((p) => {
        if (!cancelled && p && !dirty.current) setAnswers(p.answers)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [remote, workshop, worksheetId, getToken])

  const persist = useCallback(
    (next: WorksheetAnswers) => {
      writeLocal(key, next)
      const index = readIndex()
      index[`${workshop}/${worksheetId}`] = { updatedAt: new Date().toISOString(), answered: countAnswered(next) }
      writeLocal(LOCAL_KEYS.worksheetIndex, index)
      if (!remote) {
        setStatus('saved')
        return
      }
      setStatus('saving')
      apiFetch(`/api/worksheets/${workshop}/${worksheetId}`, getToken, { method: 'PUT', body: { answers: next } })
        .then(() => setStatus('saved'))
        .catch(() => setStatus('error'))
    },
    [key, workshop, worksheetId, remote, getToken],
  )

  const setAnswer = useCallback(
    (itemKey: string, value: WorksheetAnswer) => {
      dirty.current = true
      setAnswers((prev) => {
        const next = { ...prev, [itemKey]: value }
        if (timer.current) window.clearTimeout(timer.current)
        timer.current = window.setTimeout(() => persist(next), 600)
        return next
      })
    },
    [persist],
  )

  const reset = useCallback(() => {
    dirty.current = true
    setAnswers({})
    persist({})
  }, [persist])

  return { answers, setAnswer, reset, status, answered: countAnswered(answers) }
}

/** Summary of progress across all worksheets (local index; good enough for badges). */
export function useWorksheetIndex() {
  const [index, setIndex] = useState<Index>(() => readIndex())
  useEffect(() => {
    const onStorage = () => setIndex(readIndex())
    window.addEventListener('storage', onStorage)
    window.addEventListener('focus', onStorage)
    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener('focus', onStorage)
    }
  }, [])
  return index
}
