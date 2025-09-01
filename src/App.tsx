import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from '@/hooks/useAuth';
import HomePage from '@/pages/HomePage';
import PaperPage from '@/pages/PaperPage';
import DOIResolverPage from '@/pages/DOIResolverPage';
import AuthorPage from '@/pages/AuthorPage';
import JournalPage from '@/pages/JournalPage';
import UserPage from '@/pages/UserPage';
import SignInPage from '@/pages/SignInPage';
import AuthPage from '@/pages/AuthPage';
import ProfilePage from '@/pages/ProfilePage';
import NotFoundPage from '@/pages/NotFoundPage';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/paper/:paperIdAndSlug" element={<PaperPage />} />
          <Route path="/paper/doi/:encoded" element={<DOIResolverPage />} />
          <Route path="/author/:id" element={<AuthorPage />} />
          <Route path="/journal/:id" element={<JournalPage />} />
          <Route path="/u/:handle" element={<UserPage />} />
          <Route path="/signin" element={<SignInPage />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
        <Toaster />
      </Router>
    </AuthProvider>
  );
}

export default App;
