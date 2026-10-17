import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { Page } from '../components/layout/Page'
import { Callout } from '../components/ui/Callout'

export const PRIVACY_UPDATED = '17 October 2026'
export const CONTACT_EMAIL = 'harsha@ascent-i-tech.in'

/** Plain-language privacy notice, written for parents and teachers. Linked from the footer and from Google's consent screen. */
export default function PrivacyPage() {
  return (
    <Page>
      <h1 className="font-display text-4xl font-bold text-ink">Privacy 🔒</h1>
      <p className="mt-1 text-ink-soft">Last updated {PRIVACY_UPDATED}</p>
      <p className="prose-kid mt-5 max-w-3xl">
        Builders of Tomorrow is a free learning site for kids, made by Ascent Intelligent Technologies. This page explains, in plain
        words, what we keep about you, who helps us run the site, and how to get your data removed. The short version:{' '}
        <strong>we collect as little as we can, we never sell it, and there are no ads.</strong>
      </p>

      <Callout emoji="👨‍👩‍👧" tone="sun" className="mt-6 max-w-3xl" title="Under 13? Use a grown-up's email">
        If you are under 13, please sign in with a <strong>parent's or teacher's</strong> email address, not your own. The weekly
        summary and any other email then goes to them.
      </Callout>

      <Section title="What we collect">
        <p>
          <strong>Nothing, until you sign in or fill in a form.</strong> You can play every workshop as a guest. In guest mode your
          designs and worksheet answers are saved only in your own browser and never leave your device.
        </p>
        <p>
          If you <strong>register interest in an in-person workshop</strong>, we keep what you type on that form: your name, email,
          phone number if you give one, city or area, how many children and their ages, and your message. We use it only to tell
          you about that workshop, and we delete it when you ask.
        </p>
        <p>When you create an account we keep:</p>
        <ul className="mt-2 list-disc space-y-1 pl-6">
          <li>
            <strong>Your email address</strong>, so we can send you a sign-in code and know which work is yours.
          </li>
          <li>
            <strong>A first name, if you choose to give one</strong>, so the site can say hello.
          </li>
          <li>
            <strong>Your workshop work</strong>: which workshops you joined, saved rocket and bridge designs, launch and load-test
            logs, worksheet answers, and any photos or scanned worksheets you upload.
          </li>
          <li>
            <strong>Your weekly-email setting</strong> and the date we last sent you a summary.
          </li>
        </ul>
        <p>
          We do not run advertising or analytics trackers. The site uses a small number of cookies and browser storage only to
          keep you signed in and to remember your work.
        </p>
      </Section>

      <Section title="Signing in with Google">
        <p>
          If you press <strong>Continue with Google</strong>, Google tells us only your <strong>name, email address and profile
          picture</strong>. We cannot see your Google password, your Gmail, your files or anything else in your Google account, and we
          never post anything to it. You can remove our access at any time from your Google account's{' '}
          <a href="https://myaccount.google.com/permissions" target="_blank" rel="noreferrer" className="font-bold underline">
            connections page
          </a>
          .
        </p>
      </Section>

      <Section title="Who helps us run the site">
        <p>We do not build everything ourselves. These companies process data for us, and only to run Builders of Tomorrow:</p>
        <ul className="mt-2 list-disc space-y-1 pl-6">
          <li>
            <strong>Clerk</strong> handles sign-in: it stores your email (and Google profile, if you use it) and sends your sign-in
            codes.
          </li>
          <li>
            <strong>Neon</strong> hosts the database where your account and workshop work live.
          </li>
          <li>
            <strong>Resend</strong> sends the emails this site sends: the weekly summary, and a launch result when you choose to share
            one with a parent or teacher.
          </li>
          <li>
            <strong>Cloudflare</strong> hosts the website and stores uploaded photos and worksheets.
          </li>
          <li>
            <strong>Google Fonts</strong> serves the site's lettering, so your browser asks Google's servers for the font files when a
            page loads.
          </li>
        </ul>
        <p>We never sell your information or share it with anyone for marketing.</p>
      </Section>

      <Section title="Emails we send">
        <p>
          Signed-in builders get a short <strong>weekly summary</strong> of what they built, launched and tested. It is on when you
          create an account and you can switch it off any time under{' '}
          <Link to="/me" className="font-bold underline">
            My Work → Weekly summary
          </Link>
          . Apart from sign-in codes and results you choose to share, we send nothing else.
        </p>
      </Section>

      <Section title="Deleting your account">
        <p>
          Email <ContactLink /> from the address on your account and ask us to delete it. We remove your account, your saved work and
          your uploads within a few days and reply to confirm. Teachers and parents can ask on behalf of their students or children.
        </p>
      </Section>

      <Section title="Changes and questions">
        <p>
          If we change how the site handles data, we update this page and the date at the top. Questions are welcome at <ContactLink />
          . Our terms of use are{' '}
          <Link to="/terms" className="font-bold underline">
            here
          </Link>
          .
        </p>
      </Section>
    </Page>
  )
}

export function ContactLink() {
  return (
    <a href={`mailto:${CONTACT_EMAIL}`} className="font-bold underline">
      {CONTACT_EMAIL}
    </a>
  )
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="card mt-6 max-w-3xl">
      <h2 className="font-display text-2xl font-bold text-ink">{title}</h2>
      <div className="prose-kid mt-2 text-base">{children}</div>
    </section>
  )
}
