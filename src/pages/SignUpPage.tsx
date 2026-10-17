import { SignUp } from '@clerk/clerk-react'
import { authEnabled } from '../auth/AppAuth'
import { Page } from '../components/layout/Page'
import { AuthSetupNotice } from '../components/AuthSetupNotice'

export default function SignUpPage() {
  return (
    <Page>
      <div className="flex flex-col items-center">
        <h1 className="mb-2 font-display text-4xl font-bold text-ink">Join the builders! 🛠️</h1>
        <p className="mb-6 text-ink-soft">We only need an email. We will send you a code — no password to remember.</p>
        {authEnabled ? <SignUp routing="path" path="/sign-up" signInUrl="/sign-in" fallbackRedirectUrl="/me" /> : <AuthSetupNotice />}
      </div>
    </Page>
  )
}
