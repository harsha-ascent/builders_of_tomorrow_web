import { NavLink, Outlet } from 'react-router'
import { EnrollBanner } from '../../components/EnrollBanner'

const TABS = [
  { to: 'learn', label: 'Learn', emoji: '📚' },
  { to: 'design-cycle', label: 'Design Cycle', emoji: '🔁' },
  { to: 'build', label: 'Build', emoji: '🔧' },
  { to: 'launch', label: 'Launch', emoji: '🚀' },
  { to: 'worksheets', label: 'Worksheets', emoji: '📝' },
  { to: 'hangar', label: 'My Rockets', emoji: '🏠' },
  { to: 'math', label: 'The Math', emoji: '🧮' },
]

export default function WaterRocketLayout() {
  return (
    <div>
      <div className="no-print border-b border-ink/5 bg-gradient-to-r from-skyblue/25 via-transparent to-sun/25">
        <div className="mx-auto max-w-7xl px-4 pb-3 pt-6">
          <div className="flex items-center gap-3">
            <span className="animate-float text-5xl">🚀</span>
            <div>
              <h1 className="font-display text-3xl font-bold text-ink md:text-4xl">Water Rocket Lab</h1>
              <p className="text-ink-soft">Design it. Pump it. Launch it. Make it better.</p>
            </div>
          </div>
          <nav className="mt-4 flex gap-2 overflow-x-auto pb-1" aria-label="Workshop sections">
            {TABS.map((t) => (
              <NavLink
                key={t.to}
                to={t.to}
                className={({ isActive }) =>
                  `shrink-0 rounded-full px-4 py-2 font-display text-base font-semibold transition ${
                    isActive ? 'bg-ink text-white shadow-chunky-sm' : 'bg-white/70 text-ink hover:bg-white'
                  }`
                }
              >
                <span className="mr-1">{t.emoji}</span>
                {t.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </div>
      <div className="px-4">
        <EnrollBanner workshop="water-rocket" title="Water Rocket Lab" />
      </div>
      <Outlet />
    </div>
  )
}
