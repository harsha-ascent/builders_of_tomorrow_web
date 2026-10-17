import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Enrollment } from '../../shared/types'
import { apiFetch, type TokenGetter } from '../lib/api'

export interface EnrollCtx {
  remote: boolean
  getToken: TokenGetter
}

interface EnrollmentState {
  /** Workshop slugs the learner has joined (local list in guest mode, account list when signed in). */
  enrolled: string[]
  /** True once the account list has been fetched at least once this session. */
  syncedRemote: boolean
  isEnrolled: (workshop: string) => boolean
  join: (workshop: string, ctx: EnrollCtx) => Promise<void>
  leave: (workshop: string, ctx: EnrollCtx) => Promise<void>
  /** Signed in: fetch the account list and push any guest-mode joins into it. */
  syncRemote: (ctx: EnrollCtx) => Promise<void>
}

export const useEnrollmentStore = create<EnrollmentState>()(
  persist(
    (set, get) => ({
      enrolled: [],
      syncedRemote: false,
      isEnrolled: (w) => get().enrolled.includes(w),
      join: async (workshop, ctx) => {
        if (!get().enrolled.includes(workshop)) set((s) => ({ enrolled: [...s.enrolled, workshop] }))
        if (ctx.remote) {
          try {
            const list = await apiFetch<Enrollment[]>('/api/enrollments', ctx.getToken, { method: 'POST', body: { workshop } })
            set({ enrolled: list.map((e) => e.workshop) })
          } catch {
            /* keep the optimistic local state */
          }
        }
      },
      leave: async (workshop, ctx) => {
        set((s) => ({ enrolled: s.enrolled.filter((w) => w !== workshop) }))
        if (ctx.remote) {
          try {
            await apiFetch<void>(`/api/enrollments/${encodeURIComponent(workshop)}`, ctx.getToken, { method: 'DELETE' })
          } catch {
            /* ignore */
          }
        }
      },
      syncRemote: async (ctx) => {
        if (!ctx.remote) return
        try {
          const remoteList = (await apiFetch<Enrollment[]>('/api/enrollments', ctx.getToken)).map((e) => e.workshop)
          const local = get().enrolled
          const missing = local.filter((w) => !remoteList.includes(w))
          for (const w of missing) {
            await apiFetch<Enrollment[]>('/api/enrollments', ctx.getToken, { method: 'POST', body: { workshop: w } }).catch(() => undefined)
          }
          set({ enrolled: Array.from(new Set([...remoteList, ...missing])), syncedRemote: true })
        } catch {
          set({ syncedRemote: true })
        }
      },
    }),
    { name: 'bot:enrollments:v1', partialize: (s) => ({ enrolled: s.enrolled }) },
  ),
)
