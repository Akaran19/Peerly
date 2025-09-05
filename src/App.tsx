import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { Toaster } from '@/components/ui/toaster';
import AuthProvider from '@/hooks/useAuth';
import { Suspense } from 'react';
import { Analytics } from '@vercel/analytics/react';
import HomePage from '@/pages/HomePage';
import PaperPage from '@/pages/PaperPage';
import AuthorPage from '@/pages/AuthorPage';
import JournalPage from '@/pages/JournalPage';
import UserPage from '@/pages/UserPage';
import SignInPage from '@/pages/SignInPage';
import ForgotPasswordPage from '@/pages/ForgotPasswordPage';
import ResetPasswordPage from '@/pages/ResetPasswordPage';
import AuthCallbackPage from '@/pages/AuthCallbackPage';
import ProfilePage from '@/pages/ProfilePage';
import PrivacyPage from '@/pages/PrivacyPage';
import TermsPage from '@/pages/TermsPage';
import DataManagementPage from '@/pages/DataManagementPage';
import NotFoundPage from '@/pages/NotFoundPage';
import { CookieConsent } from '@/components/CookieConsent';
import { useGoogleAnalytics } from '@/lib/analytics';

function AppContent() {
  // Initialize Google Analytics with consent
  useGoogleAnalytics()

  return (
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
  )
}

function App() {
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
