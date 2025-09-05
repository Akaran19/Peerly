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
            <strong>Last updated:</strong> September 5, 2025
          </p>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">1. Introduction</h2>
            <p className="mb-4">
              Peerly ("we," "our," or "us") is committed to protecting your privacy and ensuring
              the security of your personal information. This Privacy Policy explains how we
              collect, use, disclose, and safeguard your information when you use our paper
              discovery and management platform.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">2. Information We Collect</h2>

            <h3 className="text-xl font-medium mb-2">2.1 Personal Information</h3>
            <ul className="list-disc pl-6 mb-4">
              <li>Name and email address (from OAuth providers like Google and GitHub)</li>
              <li>Profile picture and username</li>
              <li>Account preferences and settings</li>
            </ul>

            <h3 className="text-xl font-medium mb-2">2.2 Usage Data</h3>
            <ul className="list-disc pl-6 mb-4">
              <li>Pages visited and features used</li>
              <li>Time spent on the platform</li>
              <li>Device and browser information</li>
              <li>IP address and location data</li>
            </ul>

            <h3 className="text-xl font-medium mb-2">2.3 User-Generated Content</h3>
            <ul className="list-disc pl-6">
              <li>Paper reviews and ratings</li>
              <li>Reading lists and bookmarks</li>
              <li>Comments and discussions</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">3. How We Use Your Information</h2>
            <ul className="list-disc pl-6 mb-4">
              <li>Provide and maintain our services</li>
              <li>Personalize your experience</li>
              <li>Communicate with you about updates and features</li>
              <li>Analyze usage patterns to improve our platform</li>
              <li>Ensure platform security and prevent abuse</li>
              <li>Comply with legal obligations</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">4. Information Sharing</h2>
            <p className="mb-4">
              We do not sell, trade, or otherwise transfer your personal information to third
              parties, except in the following circumstances:
            </p>
            <ul className="list-disc pl-6 mb-4">
              <li>With your explicit consent</li>
              <li>To comply with legal obligations</li>
              <li>To protect our rights and prevent fraud</li>
              <li>In connection with a business transfer</li>
              <li>With service providers who assist our operations (under strict confidentiality)</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">5. Data Security</h2>
            <p className="mb-4">
              We implement appropriate technical and organizational measures to protect your
              personal information against unauthorized access, alteration, disclosure, or
              destruction. This includes encryption, access controls, and regular security audits.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">6. Your Rights (GDPR)</h2>
            <p className="mb-4">If you are located in the European Union, you have the following rights:</p>
            <ul className="list-disc pl-6 mb-4">
              <li><strong>Access:</strong> Request a copy of your personal data</li>
              <li><strong>Rectification:</strong> Correct inaccurate or incomplete data</li>
              <li><strong>Erasure:</strong> Request deletion of your personal data</li>
              <li><strong>Portability:</strong> Receive your data in a structured format</li>
              <li><strong>Restriction:</strong> Limit how we process your data</li>
              <li><strong>Objection:</strong> Object to processing based on legitimate interests</li>
            </ul>
            <p className="mb-4">
              To exercise these rights, please visit our{' '}
              <Link to="/data" className="text-primary hover:underline">
                Data Management page
              </Link>{' '}
              or contact us at{' '}
              <a href={`mailto:${import.meta.env.VITE_SUPPORT_EMAIL}`} className="text-primary hover:underline">
                {import.meta.env.VITE_SUPPORT_EMAIL}
              </a>
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">7. Cookies and Tracking</h2>
            <p className="mb-4">
              We use cookies and similar technologies to enhance your experience. You can
              manage your cookie preferences through our cookie consent banner or your browser settings.
            </p>
            <p className="mb-4">
              We use Google Analytics to understand how users interact with our platform.
              This data is anonymized and used only for improving our services.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">8. Data Retention</h2>
            <p className="mb-4">
              We retain your personal information for as long as necessary to provide our
              services and comply with legal obligations. You can request deletion of your
              account and associated data at any time.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">9. International Data Transfers</h2>
            <p className="mb-4">
              Your data may be transferred to and processed in countries other than your own.
              We ensure appropriate safeguards are in place for such transfers.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">10. Children's Privacy</h2>
            <p className="mb-4">
              Our services are not intended for children under 13. We do not knowingly collect
              personal information from children under 13.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">11. Changes to This Policy</h2>
            <p className="mb-4">
              We may update this Privacy Policy from time to time. We will notify you of any
              material changes by posting the new policy on this page and updating the
              "Last updated" date.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">12. Contact Us</h2>
            <p className="mb-4">
              If you have any questions about this Privacy Policy or our data practices,
              please contact us at:
            </p>
            <p>
              <a href={`mailto:${import.meta.env.VITE_SUPPORT_EMAIL}`} className="text-primary hover:underline">
                {import.meta.env.VITE_SUPPORT_EMAIL}
              </a>
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
