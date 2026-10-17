import { SignIn } from '@clerk/clerk-react'
import { authEnabled } from '../auth/AppAuth'
import { Page } from '../components/layout/Page'
import { AuthSetupNotice } from '../components/AuthSetupNotice'

export default function SignInPage() {
  return (
    <Page>
      <div className="flex flex-col items-center">
        <h1 className="mb-2 font-display text-4xl font-bold text-ink">Welcome, builder! 👋</h1>
        <p className="mb-6 text-ink-soft">Enter your email and we will send you a code. New here? The same box creates your account.</p>
        {authEnabled ? (
          <SignIn routing="path" path="/sign-in" signUpUrl="/sign-up" fallbackRedirectUrl="/me" withSignUp />
        ) : (
          <AuthSetupNotice />
        )}
      </div>
    </Page>
  )
}
