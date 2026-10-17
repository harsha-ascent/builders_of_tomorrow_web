import { Callout } from './ui/Callout'

/** Shown on the sign-in pages until Clerk is configured. */
export function AuthSetupNotice() {
  return (
    <div className="max-w-xl">
      <Callout emoji="🛠️" title="Accounts are not switched on yet" tone="sun">
        <p>
          This site is running in <strong>guest mode</strong>: everything you build is saved in this browser only.
        </p>
        <p className="mt-2 text-sm">
          Site owner: create a Clerk application, turn on <em>Email verification code</em> sign-in, and set{' '}
          <code className="rounded bg-ink/10 px-1">VITE_CLERK_PUBLISHABLE_KEY</code> and{' '}
          <code className="rounded bg-ink/10 px-1">CLERK_SECRET_KEY</code>. See <code>docs/SETUP.md</code>.
        </p>
      </Callout>
    </div>
  )
}
