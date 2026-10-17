import { Link } from 'react-router'
import { Page } from '../components/layout/Page'
import { LazyMount } from '../components/ui/LazyMount'
import { WORKSHOPS } from '../content/workshops'
import { HeroRocket } from '../three/HeroRocket'

export default function HomePage() {
  return (
    <Page wide>
      <section className="grid items-center gap-8 md:grid-cols-2">
        <div>
          <span className="chip mb-4">🌟 New workshop: Water Rocket Lab</span>
          <h1 className="font-display text-5xl font-bold leading-tight text-ink md:text-6xl">
            Build it. Test it. <span className="text-rocket">Make it better.</span>
          </h1>
          <p className="prose-kid mt-5 max-w-xl">
            <strong>Builders of Tomorrow</strong> is a playground for young engineers. Explore big ideas with 3-D animations,
            design your own inventions, test them, and learn how real engineers think.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link to="/workshops/water-rocket/learn" className="btn-primary text-lg">
              🚀 Start the Water Rocket Lab
            </Link>
            <a href="#how-it-works" className="btn-ghost">
              How does it work?
            </a>
          </div>
          <p className="mt-4 text-sm text-ink-soft">Free to use. No account needed to play; sign in to save your work.</p>
        </div>
        <LazyMount className="h-72 overflow-hidden rounded-blob bg-ink shadow-float md:h-96">
          <HeroRocket />
        </LazyMount>
      </section>

      <section className="mt-16">
        <h2 className="font-display text-3xl font-bold text-ink">Workshops</h2>
        <p className="mt-1 text-ink-soft">Each workshop is a mini adventure: learn, build, test, and reflect.</p>
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {WORKSHOPS.map((w) => (
            <article key={w.slug} className={`card relative flex flex-col overflow-hidden ${w.status === 'soon' ? 'opacity-80' : ''}`}>
              <div className={`-mx-5 -mt-5 mb-4 bg-gradient-to-br ${w.accent} px-5 py-6 text-6xl`}>{w.emoji}</div>
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-display text-xl font-bold text-ink">{w.title}</h3>
                {w.status === 'soon' ? <span className="chip shrink-0">Soon</span> : <span className="chip shrink-0 bg-grass/30 text-ink">Live</span>}
              </div>
              <p className="mt-1 text-sm font-bold text-ink-soft">{w.ages}</p>
              <p className="mt-2 flex-1 text-ink">{w.description}</p>
              <ul className="mt-3 flex flex-wrap gap-1">
                {w.skills.map((s) => (
                  <li key={s} className="rounded-full bg-ink/5 px-2 py-0.5 text-xs font-bold text-ink-soft">
                    {s}
                  </li>
                ))}
              </ul>
              {w.status === 'live' ? (
                <Link to={w.path} className="btn-sky mt-4">
                  Open workshop
                </Link>
              ) : (
                <button type="button" className="btn-ghost mt-4" disabled>
                  Coming soon
                </button>
              )}
            </article>
          ))}
        </div>
      </section>

      <section id="how-it-works" className="mt-16">
        <h2 className="font-display text-3xl font-bold text-ink">How a workshop works</h2>
        <div className="mt-6 grid gap-5 md:grid-cols-3">
          {[
            { emoji: '📚', title: '1. Learn', text: 'Play with 3-D animations that show the science: pushes, pressure, angles and more.' },
            { emoji: '🔧', title: '2. Build & test', text: 'Design your own rocket, predict what will happen, then launch it on the virtual pad.' },
            { emoji: '📝', title: '3. Think like an engineer', text: 'Fill in worksheets, keep a design journal, and go round the engineering design cycle.' },
          ].map((s) => (
            <div key={s.title} className="card">
              <div className="text-5xl">{s.emoji}</div>
              <h3 className="mt-3 font-display text-xl font-bold">{s.title}</h3>
              <p className="mt-1 text-ink">{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="card mt-16 bg-ink text-white">
        <div className="grid gap-6 md:grid-cols-[2fr_1fr] md:items-center">
          <div>
            <h2 className="font-display text-3xl font-bold">For parents and teachers</h2>
            <p className="mt-2 text-white/85">
              Builders of Tomorrow is made by{' '}
              <a href="https://ascent-i-tech.in/" target="_blank" rel="noreferrer" className="font-bold underline decoration-sun decoration-4">
                Ascent Intelligent Technologies
              </a>
              . Every workshop pairs an interactive simulation with printable worksheets, so it works on a screen at home or
              projected in a classroom. Students can sign in with just an email code to keep their designs and worksheets.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <Link to="/workshops/water-rocket/worksheets" className="btn-sun">
              Browse worksheets
            </Link>
            <Link to="/workshops/water-rocket/design-cycle" className="btn-ghost !bg-white/10 !text-white !ring-white/30">
              The design cycle
            </Link>
          </div>
        </div>
      </section>
    </Page>
  )
}
