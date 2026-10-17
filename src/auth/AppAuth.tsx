import { ClerkProvider, useAuth, useUser } from '@clerk/clerk-react'
import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { useNavigate } from 'react-router'

export interface AppAuthState {
  /** True when Clerk is configured (VITE_CLERK_PUBLISHABLE_KEY is set). */
  enabled: boolean
  isLoaded: boolean
  isSignedIn: boolean
  userId: string | null
  displayName: string | null
  email: string | null
  getToken: () => Promise<string | null>
  signOut: () => Promise<void>
}

export const CLERK_PUBLISHABLE_KEY = (import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string | undefined)?.trim()
export const authEnabled = Boolean(CLERK_PUBLISHABLE_KEY)

const guestState: AppAuthState = {
  enabled: false,
  isLoaded: true,
  isSignedIn: false,
  userId: null,
  displayName: null,
  email: null,
  getToken: async () => null,
  signOut: async () => {},
}

const AppAuthContext = createContext<AppAuthState>(guestState)

export function useAppAuth() {
  return useContext(AppAuthContext)
}

/**
 * Wraps the app in Clerk when a publishable key is present. Without a key the
 * site still works in "guest mode": everything is saved in the browser only.
 */
export function AppAuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  if (!authEnabled) {
    return <AppAuthContext.Provider value={guestState}>{children}</AppAuthContext.Provider>
  }
  return (
    <ClerkProvider
      publishableKey={CLERK_PUBLISHABLE_KEY!}
      routerPush={(to) => navigate(to)}
      routerReplace={(to) => navigate(to, { replace: true })}
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
      afterSignOutUrl="/"
      appearance={{
        variables: {
          colorPrimary: '#ff6b6b',
          colorText: '#1e2a4a',
          borderRadius: '1rem',
          fontFamily: 'Nunito, system-ui, sans-serif',
          fontSize: '16px',
        },
        elements: {
          card: 'shadow-float rounded-blob',
          formButtonPrimary: 'font-display text-base',
        },
      }}
    >
      <ClerkBridge>{children}</ClerkBridge>
    </ClerkProvider>
  )
}

function ClerkBridge({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn, userId, getToken, signOut } = useAuth()
  const { user } = useUser()
  const value = useMemo<AppAuthState>(
    () => ({
      enabled: true,
      isLoaded,
      isSignedIn: Boolean(isSignedIn),
      userId: userId ?? null,
      displayName: user?.firstName || user?.username || user?.primaryEmailAddress?.emailAddress?.split('@')[0] || null,
      email: user?.primaryEmailAddress?.emailAddress ?? null,
      getToken: () => getToken(),
      signOut: () => signOut(),
    }),
    [isLoaded, isSignedIn, userId, user, getToken, signOut],
  )
  return <AppAuthContext.Provider value={value}>{children}</AppAuthContext.Provider>
}
