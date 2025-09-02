import { Link } from 'react-router-dom';
import Header from '@/components/Header';

export default function PrivacyPage() {
  return (
    <div className="page-wrapper">
      <Header />
      <main className="page-container max-w-4xl mx-auto">
        <div className="mb-6">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            ← Back to home
          </Link>
        </div>

        <div className="prose prose-slate dark:prose-invert max-w-none">
          <h1 className="text-4xl font-bold mb-8">Privacy Policy</h1>

          <p className="text-muted-foreground mb-6">
            <strong>Last updated:</strong> September 2, 2025
          </p>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Information We Collect</h2>
            <p className="mb-4">
              We collect information you provide directly to us, such as when you create an account,
              submit reviews, or contact us for support.
            </p>
            <ul className="list-disc pl-6 mb-4">
              <li>Account information (email, username)</li>
              <li>Paper reviews and ratings you submit</li>
              <li>Usage data and analytics</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">How We Use Your Information</h2>
            <p className="mb-4">
              We use the information we collect to:
            </p>
            <ul className="list-disc pl-6 mb-4">
              <li>Provide and maintain our service</li>
              <li>Process your reviews and ratings</li>
              <li>Send you technical notices and support messages</li>
              <li>Improve our services through analytics</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Information Sharing</h2>
            <p className="mb-4">
              We do not sell, trade, or otherwise transfer your personal information to third parties
              without your consent, except as described in this policy.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Data Security</h2>
            <p className="mb-4">
              We implement appropriate security measures to protect your personal information against
              unauthorized access, alteration, disclosure, or destruction.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Contact Us</h2>
            <p className="mb-4">
              If you have any questions about this Privacy Policy, please contact us at:
            </p>
            <p>
              <a href="mailto:akaran1909@gmail.com" className="text-primary hover:underline">
                akaran1909@gmail.com
              </a>
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
