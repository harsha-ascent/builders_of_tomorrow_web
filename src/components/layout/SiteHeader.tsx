import { SignedIn, SignedOut, UserButton } from '@clerk/clerk-react'
import { Link, NavLink } from 'react-router'
import { authEnabled } from '../../auth/AppAuth'

const navClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-full px-4 py-2 font-display text-base font-semibold transition ${
    isActive ? 'bg-ink text-white' : 'text-ink hover:bg-ink/5'
  }`

export function SiteHeader() {
  return (
    <header className="no-print sticky top-0 z-40 border-b border-ink/5 bg-cream/80 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3">
        <Link to="/" className="flex items-center gap-2">
          <img src="/logo.svg" alt="" className="h-10 w-10 rounded-xl shadow-chunky-sm" />
          <div className="leading-tight">
            <div className="whitespace-nowrap font-display text-lg font-bold text-ink sm:text-xl">Builders of Tomorrow</div>
            <div className="text-[11px] font-extrabold uppercase tracking-widest text-ink-soft">by Ascent I-Tech</div>
          </div>
        </Link>
        <nav className="hidden items-center gap-1 sm:flex" aria-label="Main">
          <NavLink to="/" end className={navClass}>
            Home
          </NavLink>
          <NavLink to="/workshops/water-rocket" className={navClass}>
            Water Rocket Lab
          </NavLink>
          <NavLink to="/me" className={navClass}>
            My Work
          </NavLink>
        </nav>
        <div className="flex items-center gap-2">
          {authEnabled ? (
            <>
              <SignedOut>
                <Link to="/sign-in" className="btn-sun !px-4 !py-2 text-sm">
                  Sign in
                </Link>
              </SignedOut>
              <SignedIn>
                <UserButton />
              </SignedIn>
            </>
          ) : (
            <span className="chip" title="Set VITE_CLERK_PUBLISHABLE_KEY to enable accounts">
              👤 Guest mode
            </span>
          )}
        </div>
      </div>
      <nav className="flex gap-1 overflow-x-auto px-4 pb-2 sm:hidden" aria-label="Main mobile">
        <NavLink to="/" end className={navClass}>
          Home
        </NavLink>
        <NavLink to="/workshops/water-rocket" className={navClass}>
          Rocket Lab
        </NavLink>
        <NavLink to="/me" className={navClass}>
          My Work
        </NavLink>
      </nav>
    </header>
  )
}
