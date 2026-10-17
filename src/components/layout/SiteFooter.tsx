import { Link } from 'react-router'

export function SiteFooter() {
  return (
    <footer className="no-print mt-16 border-t border-ink/5 bg-white/60">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-8 text-sm text-ink-soft sm:flex-row">
        <div>
          Made with ❤️ by{' '}
          <a
            href="https://ascent-i-tech.in/"
            target="_blank"
            rel="noreferrer"
            className="font-bold text-ink underline decoration-sun decoration-4 underline-offset-2"
          >
            Ascent Intelligent Technologies
          </a>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
          <span>Builders of Tomorrow · STEM workshops for curious kids</span>
          <Link to="/in-person" className="font-bold text-ink underline underline-offset-2">
            In-person workshops
          </Link>
          <Link to="/privacy" className="font-bold text-ink underline underline-offset-2">
            Privacy
          </Link>
          <Link to="/terms" className="font-bold text-ink underline underline-offset-2">
            Terms
          </Link>
        </div>
      </div>
    </footer>
  )
}
