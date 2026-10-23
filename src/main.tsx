import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ClerkProvider } from '@clerk/clerk-react'
import App from './App.tsx'
import './index.css'
import { initSentry } from './lib/sentry'
import { patchDomForExternalMutations } from './lib/domPatch'

// Match Clerk's sign-in screens to Peerly's paper-and-ink theme
const clerkAppearance = {
  variables: {
    colorPrimary: 'hsl(28 14% 11%)',
    colorText: 'hsl(28 14% 11%)',
    colorTextSecondary: 'hsl(30 8% 38%)',
    colorBackground: 'hsl(42 40% 98.5%)',
    colorInputBackground: 'hsl(42 40% 98.5%)',
    fontFamily: '"Schibsted Grotesk", ui-sans-serif, system-ui, sans-serif',
    borderRadius: '0.375rem',
  },
  elements: {
    cardBox: { boxShadow: '4px 4px 0 0 hsl(28 14% 11%)', border: '1px solid hsl(28 14% 11%)' },
    card: { boxShadow: 'none' },
    headerTitle: { fontFamily: 'Newsreader, Georgia, serif', fontWeight: 500, fontSize: '1.6rem' },
  },
}

patchDomForExternalMutations()

// Initialize Sentry for error monitoring
initSentry()

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

if (!PUBLISHABLE_KEY) {
  throw new Error("Missing Publishable Key")
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ClerkProvider
      publishableKey={PUBLISHABLE_KEY}
      afterSignOutUrl="/"
      appearance={clerkAppearance}
    >
      <App />
    </ClerkProvider>
  </StrictMode>,
)
