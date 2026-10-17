import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import type { InterestRequestInput } from '../../shared/validation'
import { useAppAuth } from '../auth/AppAuth'
import { Page } from '../components/layout/Page'
import { Callout } from '../components/ui/Callout'
import { Segmented } from '../components/ui/Segmented'
import { ApiError, apiFetch } from '../lib/api'

type Format = 'school' | 'public' | 'either'

/** Register interest in a physical, in-person water-rocket workshop. Public; no account needed. */
export default function InPersonPage() {
  const { displayName, email: signedInEmail, getToken } = useAppAuth()
  const [name, setName] = useState(displayName ?? '')
  const [email, setEmail] = useState(signedInEmail ?? '')
  const [phone, setPhone] = useState('')
  const [city, setCity] = useState('')
  const [kids, setKids] = useState(1)
  const [ages, setAges] = useState('')
  const [format, setFormat] = useState<Format>('either')
  const [message, setMessage] = useState('')
  const [website, setWebsite] = useState('') // honeypot: hidden from people, filled by bots
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const body: InterestRequestInput = { workshop: 'water-rocket', name, email, phone, city, kids, ages, format, message, website }
    try {
      await apiFetch<{ ok: boolean }>('/api/interest', getToken, { method: 'POST', body })
      setDone(true)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again in a moment.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Page>
      <span className="chip mb-4">🏫 Coming soon</span>
      <h1 className="font-display text-4xl font-bold text-ink md:text-5xl">
        Build and launch a <span className="text-rocket">real</span> water rocket with us
      </h1>
      <p className="prose-kid mt-4 max-w-3xl">
        The online lab is where the ideas start. Next come <strong>in-person workshops</strong>: kids build a water rocket from a
        bottle with their own hands, pump it up outdoors and launch it, then go round the engineering design cycle for real:
        measure the flight, change one thing, launch again. Sessions are planned for schools, clubs and public weekend events.
      </p>
      <p className="mt-3 max-w-3xl text-ink-soft">
        Dates and places are not fixed yet. Leave a few details and we will email you first when a session opens near you.
        Parents, teachers and club leaders are all welcome to ask.
      </p>

      <div className="mt-8 grid gap-6 lg:grid-cols-[3fr_2fr]">
        {done ? (
          <Callout emoji="🎉" tone="grass" title="Thank you! You are on the list.">
            We will email {email} when an in-person rocket workshop opens near {city}. Until then, the{' '}
            <Link to="/workshops/water-rocket/learn" className="font-bold underline">
              online Water Rocket Lab
            </Link>{' '}
            is a great warm-up.
          </Callout>
        ) : (
          <form className="card space-y-4" onSubmit={(e) => void submit(e)} noValidate>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="ip-name">
                  Your name
                </label>
                <input id="ip-name" className="input" value={name} onChange={(e) => setName(e.target.value)} required maxLength={80} autoComplete="name" />
              </div>
              <div>
                <label className="label" htmlFor="ip-email">
                  Email
                </label>
                <input id="ip-email" className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required maxLength={120} autoComplete="email" />
              </div>
              <div>
                <label className="label" htmlFor="ip-phone">
                  Phone or WhatsApp <span className="font-normal normal-case">(optional)</span>
                </label>
                <input id="ip-phone" className="input" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={30} autoComplete="tel" />
              </div>
              <div>
                <label className="label" htmlFor="ip-city">
                  City or area
                </label>
                <input id="ip-city" className="input" value={city} onChange={(e) => setCity(e.target.value)} required maxLength={80} autoComplete="address-level2" />
              </div>
              <div>
                <label className="label" htmlFor="ip-kids">
                  How many children?
                </label>
                <input
                  id="ip-kids"
                  className="input"
                  type="number"
                  min={1}
                  max={60}
                  value={kids}
                  onChange={(e) => setKids(Math.max(1, Math.min(60, Math.round(Number(e.target.value) || 1))))}
                  required
                />
              </div>
              <div>
                <label className="label" htmlFor="ip-ages">
                  Their ages <span className="font-normal normal-case">(optional)</span>
                </label>
                <input id="ip-ages" className="input" value={ages} onChange={(e) => setAges(e.target.value)} placeholder="e.g. 9 and 12" maxLength={60} />
              </div>
            </div>

            <Segmented<Format>
              label="Where would suit you?"
              value={format}
              onChange={setFormat}
              options={[
                { value: 'school', label: 'School or club', emoji: '🏫', hint: 'we come to you' },
                { value: 'public', label: 'Weekend event', emoji: '🌳', hint: 'open session' },
                { value: 'either', label: 'Either', emoji: '👍' },
              ]}
            />

            <div>
              <label className="label" htmlFor="ip-message">
                Anything else? <span className="font-normal normal-case">(optional)</span>
              </label>
              <textarea
                id="ip-message"
                className="input min-h-24"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                maxLength={600}
                placeholder="A school name, a class size, a date that would work…"
              />
            </div>

            {/* Honeypot: real people never see or fill this. */}
            <div className="absolute -left-[9999px] top-auto h-px w-px overflow-hidden" aria-hidden="true">
              <label htmlFor="ip-website">Website</label>
              <input id="ip-website" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
            </div>

            {error && (
              <Callout emoji="⚠️" tone="rocket">
                {error}
              </Callout>
            )}

            <div className="flex flex-wrap items-center gap-3">
              <button type="submit" className="btn-primary" disabled={busy || !name.trim() || !email.trim() || !city.trim()}>
                {busy ? 'Sending…' : '🚀 Keep me posted'}
              </button>
              <span className="text-sm text-ink-soft">
                We only use this to contact you about the workshop. See our{' '}
                <Link to="/privacy" className="font-bold underline">
                  privacy page
                </Link>
                .
              </span>
            </div>
          </form>
        )}

        <div className="space-y-4">
          <div className="card">
            <h2 className="font-display text-xl font-bold text-ink">What a session looks like</h2>
            <ul className="mt-2 space-y-2 text-ink">
              <li>🧰 Every child builds their own rocket from a bottle, card and tape.</li>
              <li>💨 We pump and launch outdoors, with eye protection and an adult on the pump.</li>
              <li>📏 Kids measure height and distance, then change one thing and launch again.</li>
              <li>📝 The same worksheets as the online lab, so the learning carries on at home.</li>
            </ul>
          </div>
          <div className="card bg-sun/20">
            <h2 className="font-display text-xl font-bold text-ink">Good to know</h2>
            <ul className="mt-2 space-y-2 text-ink">
              <li>👧 Best for ages 8 to 14; younger builders need a grown-up alongside.</li>
              <li>🏫 Schools and clubs: we bring the launcher and materials to you.</li>
              <li>📬 Leaving your details is not a booking. We will email when dates open.</li>
            </ul>
          </div>
        </div>
      </div>
    </Page>
  )
}
