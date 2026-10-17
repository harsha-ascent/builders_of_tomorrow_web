import { useCallback, useEffect } from 'react'
import { useAppAuth } from '../auth/AppAuth'
import { useEnrollmentStore } from '../store/enrollmentStore'

/** Joined workshops, kept in sync with the account when signed in. */
export function useEnrollments() {
  const { isSignedIn, isLoaded, getToken } = useAppAuth()
  const remote = isLoaded && isSignedIn
  const enrolled = useEnrollmentStore((s) => s.enrolled)
  const syncedRemote = useEnrollmentStore((s) => s.syncedRemote)
  const joinRaw = useEnrollmentStore((s) => s.join)
  const leaveRaw = useEnrollmentStore((s) => s.leave)
  const syncRemote = useEnrollmentStore((s) => s.syncRemote)

  useEffect(() => {
    if (remote && !syncedRemote) void syncRemote({ remote, getToken })
  }, [remote, syncedRemote, syncRemote, getToken])

  const join = useCallback((workshop: string) => joinRaw(workshop, { remote, getToken }), [joinRaw, remote, getToken])
  const leave = useCallback((workshop: string) => leaveRaw(workshop, { remote, getToken }), [leaveRaw, remote, getToken])
  const isEnrolled = useCallback((workshop: string) => enrolled.includes(workshop), [enrolled])

  return { enrolled, isEnrolled, join, leave, remote }
}
