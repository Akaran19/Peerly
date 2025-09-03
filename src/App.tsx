import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from '@/hooks/useAuth';
import { Analytics } from '@vercel/analytics/react';
import HomePage from '@/pages/HomePage';
import PaperPage from '@/pages/PaperPage';
import DOIResolverPage from '@/pages/DOIResolverPage';
import PMIDResolverPage from '@/pages/PMIDResolverPage';
import ExternalPaperResolverPage from '@/pages/ExternalPaperResolverPage';
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
import NotFoundPage from '@/pages/NotFoundPage';

function App() {
  return (
    <HelmetProvider>
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/paper/:paperIdAndSlug" element={<PaperPage />} />
            <Route path="/paper/doi/:encoded" element={<DOIResolverPage />} />
            <Route path="/paper/external/:source/:id" element={<ExternalPaperResolverPage />} />
            <Route path="/paper/pmid/:pmid" element={<PMIDResolverPage />} />
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
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
          <Toaster />
        </Router>
        <Analytics />
      </AuthProvider>
    </HelmetProvider>
  );
}

export default App;
