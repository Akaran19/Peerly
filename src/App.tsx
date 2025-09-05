import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { Toaster } from '@/components/ui/toaster';
import AuthProvider from '@/hooks/useAuth';
import { Suspense, lazy } from 'react';
import { Analytics } from '@vercel/analytics/react';
import { CookieConsent } from '@/components/CookieConsent';
import { useGoogleAnalytics } from '@/lib/analytics';

// Lazy load pages for code splitting
const HomePage = lazy(() => import('@/pages/HomePage'));
const PaperPage = lazy(() => import('@/pages/PaperPage'));
const AuthorPage = lazy(() => import('@/pages/AuthorPage'));
const JournalPage = lazy(() => import('@/pages/JournalPage'));
const UserPage = lazy(() => import('@/pages/UserPage'));
const SignInPage = lazy(() => import('@/pages/SignInPage'));
const ForgotPasswordPage = lazy(() => import('@/pages/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('@/pages/ResetPasswordPage'));
const AuthCallbackPage = lazy(() => import('@/pages/AuthCallbackPage'));
const ProfilePage = lazy(() => import('@/pages/ProfilePage'));
const PrivacyPage = lazy(() => import('@/pages/PrivacyPage'));
const TermsPage = lazy(() => import('@/pages/TermsPage'));
const DataManagementPage = lazy(() => import('@/pages/DataManagementPage'));
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'));

function AppContent() {
  // Initialize Google Analytics with consent
  useGoogleAnalytics()

  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    }>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/paper/:paperIdAndSlug" element={<PaperPage />} />
        <Route path="/author/:id" element={<AuthorPage />} />
        <Route path="/journal/:id" element={<JournalPage />} />
        <Route path="/u/:handle" element={<UserPage />} />
        <Route path="/signin" element={<SignInPage />} />
        <Route path="/auth" element={<AuthCallbackPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/data" element={<DataManagementPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  )
}function App() {
  return (
    <HelmetProvider>
      <AuthProvider>
        <Router>
          <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>}>
            <AppContent />
          </Suspense>
          <Toaster />
          <CookieConsent />
        </Router>
        <Analytics />
      </AuthProvider>
    </HelmetProvider>
  );
}

export default App;
