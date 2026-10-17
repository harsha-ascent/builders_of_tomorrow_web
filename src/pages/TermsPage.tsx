import { Link } from 'react-router'
import { Page } from '../components/layout/Page'
import { Callout } from '../components/ui/Callout'
import { ContactLink, PRIVACY_UPDATED, Section } from './PrivacyPage'

/** Short, plain-language terms of use. Linked from the footer and from Google's consent screen. */
export default function TermsPage() {
  return (
    <Page>
      <h1 className="font-display text-4xl font-bold text-ink">Terms of use 🤝</h1>
      <p className="mt-1 text-ink-soft">Last updated {PRIVACY_UPDATED}</p>
      <p className="prose-kid mt-5 max-w-3xl">
        Builders of Tomorrow is run by Ascent Intelligent Technologies. By using the site you agree to these few, simple rules.
      </p>

      <Section title="It is free">
        <p>
          Everything here is free for kids, parents and teachers, at home or in a classroom. You do not need an account to play;
          an account only saves your work. We may change, pause or retire a workshop at any time.
        </p>
      </Section>

      <Section title="Be kind">
        <p>
          Give your designs, uploads and shared notes names a teacher would be happy to read. Do not upload photos of other people
          without their permission, and only share results with people you know. We can remove content or close an account that
          breaks these rules.
        </p>
      </Section>

      <Section title="No warranty">
        <p>
          The simulations are simplified models for learning, not engineering tools. They can be wrong, and the site may sometimes be
          down or lose data. We provide it <strong>as is</strong>, with no warranty of any kind, and we are not liable for anything that
          happens from using it.
        </p>
      </Section>

      <Callout emoji="🦺" tone="rocket" className="mt-6 max-w-3xl" title="Real rockets and bridges need a grown-up">
        Building and launching a real water rocket, or loading a real model bridge, is your own responsibility. Wear eye protection,
        keep everyone behind the launcher and always have an adult supervise.
      </Callout>

      <Section title="Your work and ours">
        <p>
          Your designs, answers and uploads stay yours. The lessons, worksheets, pictures and code of the site belong to Ascent
          Intelligent Technologies; teachers may print and copy the worksheets for their own classes.
        </p>
      </Section>

      <Section title="Privacy and contact">
        <p>
          How we handle your data is explained on the{' '}
          <Link to="/privacy" className="font-bold underline">
            privacy page
          </Link>
          . For anything else, write to <ContactLink />.
        </p>
      </Section>
    </Page>
  )
}
