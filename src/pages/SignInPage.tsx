import { SignIn } from '@clerk/clerk-react'
import { authEnabled } from '../auth/AppAuth'
import { Page } from '../components/layout/Page'
import { AuthSetupNotice } from '../components/AuthSetupNotice'

export default function SignInPage() {
  return (
    <Page>
      <div className="flex flex-col items-center">
        <h1 className="mb-6 font-display text-4xl font-bold text-ink">Welcome back, builder! 👋</h1>
        {authEnabled ? <SignIn routing="path" path="/sign-in" signUpUrl="/sign-up" fallbackRedirectUrl="/me" /> : <AuthSetupNotice />}
      </div>
    </Page>
  )
}
