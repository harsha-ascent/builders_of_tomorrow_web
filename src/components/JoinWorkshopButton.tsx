import { useEnrollments } from '../lib/useEnrollments'

export function JoinWorkshopButton({ workshop, className = '', size = 'md' }: { workshop: string; className?: string; size?: 'sm' | 'md' }) {
  const { isEnrolled, join, leave } = useEnrollments()
  const joined = isEnrolled(workshop)
  const sz = size === 'sm' ? '!px-3 !py-1 text-sm' : ''
  return joined ? (
    <button type="button" className={`btn-ghost ${sz} ${className}`} onClick={() => void leave(workshop)} title="Leave this workshop">
      ✅ Joined
    </button>
  ) : (
    <button type="button" className={`btn-sun ${sz} ${className}`} onClick={() => void join(workshop)}>
      ➕ Join workshop
    </button>
  )
}
