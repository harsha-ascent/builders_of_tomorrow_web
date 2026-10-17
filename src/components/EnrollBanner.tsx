import { useEnrollments } from '../lib/useEnrollments'
import { JoinWorkshopButton } from './JoinWorkshopButton'

/** Shown under a workshop's tabs until the learner has joined it. */
export function EnrollBanner({ workshop, title }: { workshop: string; title: string }) {
  const { isEnrolled } = useEnrollments()
  if (isEnrolled(workshop)) return null
  return (
    <div className="no-print mx-auto mt-4 flex max-w-7xl flex-wrap items-center justify-between gap-3 rounded-2xl border-2 border-dashed border-sun bg-sun/15 px-4 py-3 text-sm">
      <span>
        👀 You are exploring the <strong>{title}</strong>. Join it to add it to My Work and your weekly summary. (Saving a design joins it too.)
      </span>
      <JoinWorkshopButton workshop={workshop} size="sm" />
    </div>
  )
}
